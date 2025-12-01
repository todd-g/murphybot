#!/usr/bin/env python3
"""
sync_notes.py - Push markdown notes from local to Convex

This script:
1. Scans JD folders for .md files
2. Parses each file for frontmatter (jdId, title, version)
3. Checks for conflicts using version tracking
4. Upserts to Convex notes table with conflict detection
5. Creates .conflict backup files when conflicts occur

For the app-first architecture, Convex is the source of truth.
Local edits are pushed UP but conflicts are detected and preserved.

Usage:
    python sync_notes.py              # Sync all notes
    python sync_notes.py file1.md ... # Sync specific files
    python sync_notes.py --force      # Force overwrite (ignores conflicts)
"""

import os
import sys
import re
import json
import httpx
import shutil
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

try:
    import frontmatter
except ImportError:
    print("Error: python-frontmatter not installed")
    print("Run: pip install python-frontmatter")
    sys.exit(1)

# Load environment variables
load_dotenv()

# Configuration
CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL") or os.getenv("CONVEX_URL")
REPO_ROOT = Path(__file__).parent.parent
SECOND_BRAIN = REPO_ROOT / "second-brain"
SYNC_STATE_FILE = SECOND_BRAIN / "_sync_state.json"

# JD folders to scan (exclude inbox)
JD_FOLDERS = [
    "00-index",
    "10-reference",
    "20-projects",
    "30-people",
    "40-media",
    "50-events",
    "60-ideas",
    "70-home",
    "80-personal",
    "90-archive",
]


def load_sync_state() -> dict:
    """Load the sync state from _sync_state.json."""
    if SYNC_STATE_FILE.exists():
        with open(SYNC_STATE_FILE, "r") as f:
            return json.load(f)
    return {"notes": {}, "last_sync": None}


def save_sync_state(state: dict) -> None:
    """Save the sync state to _sync_state.json."""
    state["last_sync"] = datetime.utcnow().isoformat()
    with open(SYNC_STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def extract_jd_id(filepath: Path, content: frontmatter.Post) -> str:
    """Extract JD ID from frontmatter or filename."""
    # Try frontmatter first
    if content.get("jdId"):
        return content["jdId"]
    
    # Try to extract from filename (e.g., 50.01-local-events.md -> 50.01)
    filename = filepath.stem
    match = re.match(r"^(\d+\.\d+)", filename)
    if match:
        return match.group(1)
    
    # Try to extract from folder + filename (e.g., 50-events/local-events.md -> 50.00)
    folder_name = filepath.parent.name
    folder_match = re.match(r"^(\d+)", folder_name)
    if folder_match:
        return f"{folder_match.group(1)}.00"
    
    return "00.00"


def extract_title(filepath: Path, content: frontmatter.Post) -> str:
    """Extract title from frontmatter or first heading."""
    # Try frontmatter first
    if content.get("title"):
        return content["title"]
    
    # Try to find first heading in content
    lines = content.content.split("\n")
    for line in lines:
        if line.startswith("# "):
            return line[2:].strip()
    
    # Fall back to filename
    return filepath.stem.replace("-", " ").title()


def extract_version(content: frontmatter.Post) -> int:
    """Extract version from frontmatter, default to 0."""
    return int(content.get("version", 0))


def get_relative_path(filepath: Path) -> str:
    """Get path relative to second-brain folder."""
    try:
        return str(filepath.relative_to(SECOND_BRAIN))
    except ValueError:
        return str(filepath)


def create_conflict_backup(filepath: Path) -> Path:
    """Create a .conflict backup of the local file."""
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    conflict_path = filepath.with_suffix(f".conflict-{timestamp}.md")
    shutil.copy2(filepath, conflict_path)
    return conflict_path


def sync_note(client: httpx.Client, filepath: Path, force: bool = False, state: dict = None) -> dict:
    """Sync a single note to Convex with conflict detection."""
    # Read and parse the file
    with open(filepath, "r", encoding="utf-8") as f:
        content = frontmatter.load(f)
    
    # Extract metadata
    jd_id = extract_jd_id(filepath, content)
    title = extract_title(filepath, content)
    relative_path = get_relative_path(filepath)
    local_version = extract_version(content)
    
    # Get the expected version from sync state
    expected_version = None
    if state and not force:
        note_state = state.get("notes", {}).get(relative_path, {})
        expected_version = note_state.get("version")
    
    # Prepare the full content (without frontmatter - we'll add it fresh on sync down)
    full_content = content.content
    
    # Build upsert args
    upsert_args = {
        "jdId": jd_id,
        "path": relative_path,
        "title": title,
        "content": full_content,
    }
    
    # Only include expectedVersion if we have one and not forcing
    if expected_version is not None and not force:
        upsert_args["expectedVersion"] = expected_version
    
    # Call Convex upsert
    response = client.post(
        f"{CONVEX_URL}/api/mutation",
        json={
            "path": "notes:upsert",
            "args": upsert_args,
        },
    )
    response.raise_for_status()
    result = response.json()
    value = result.get("value", {})
    
    action = value.get("action", "unknown")
    new_version = value.get("version", local_version + 1)
    
    return {
        "path": relative_path,
        "jdId": jd_id,
        "title": title,
        "action": action,
        "version": new_version,
        "currentVersion": value.get("currentVersion"),
        "expectedVersion": value.get("expectedVersion"),
    }


def find_all_notes() -> list[Path]:
    """Find all markdown files in JD folders."""
    notes = []
    for folder in JD_FOLDERS:
        folder_path = SECOND_BRAIN / folder
        if folder_path.exists():
            notes.extend(folder_path.glob("**/*.md"))
    return sorted(notes)


def main():
    """Main sync function."""
    force = "--force" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    
    if not CONVEX_URL:
        print("Error: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable not set")
        print("Please set it in your .env file or environment")
        sys.exit(1)
    
    # Load sync state for conflict detection
    state = load_sync_state()
    
    # Determine which files to sync
    if args:
        # Sync specific files
        files = [Path(f) for f in args if f.endswith(".md")]
        # Filter to only files in second-brain (not inbox)
        files = [
            f for f in files 
            if f.exists() 
            and "inbox" not in str(f) 
            and str(SECOND_BRAIN) in str(f.resolve())
        ]
    else:
        # Sync all notes
        files = find_all_notes()
    
    if not files:
        print("No markdown files to sync.")
        return
    
    print(f"Syncing {len(files)} note(s) to Convex...")
    if force:
        print("Force mode: ignoring conflicts")
    
    with httpx.Client(timeout=30.0) as client:
        created = 0
        updated = 0
        conflicts = 0
        errors = 0
        
        new_state = state.copy()
        new_state["notes"] = state.get("notes", {}).copy()
        
        for filepath in files:
            try:
                result = sync_note(client, filepath, force, state)
                action = result["action"]
                
                if action == "conflict":
                    conflicts += 1
                    current_v = result.get("currentVersion", "?")
                    expected_v = result.get("expectedVersion", "?")
                    
                    # Create a backup of the local file
                    backup_path = create_conflict_backup(filepath)
                    
                    print(f"  [!] CONFLICT: {result['path']}")
                    print(f"      Local expected v{expected_v}, remote is v{current_v}")
                    print(f"      Local saved to: {backup_path.name}")
                    print(f"      Run sync_down.py to get remote version")
                    
                elif action == "created":
                    created += 1
                    new_state["notes"][result["path"]] = {
                        "version": result["version"],
                        "synced_at": datetime.utcnow().isoformat(),
                    }
                    print(f"  [+] {result['path']} ({result['jdId']}) v{result['version']}")
                    
                elif action == "updated":
                    updated += 1
                    new_state["notes"][result["path"]] = {
                        "version": result["version"],
                        "synced_at": datetime.utcnow().isoformat(),
                    }
                    print(f"  [~] {result['path']} ({result['jdId']}) v{result['version']}")
                    
                else:
                    print(f"  [?] {result['path']} ({action})")
                    
            except Exception as e:
                errors += 1
                print(f"  [!] Error syncing {filepath}: {e}")
        
        # Save updated sync state
        save_sync_state(new_state)
        
        print()
        print(f"Done!")
        print(f"  Created: {created}")
        print(f"  Updated: {updated}")
        if conflicts:
            print(f"  Conflicts: {conflicts} (see .conflict files)")
        if errors:
            print(f"  Errors: {errors}")
        
        if conflicts:
            print()
            print("To resolve conflicts:")
            print("  1. Run: python sync_down.py  (to get remote version)")
            print("  2. Manually merge .conflict files with updated notes")
            print("  3. Delete .conflict files when done")


if __name__ == "__main__":
    main()
