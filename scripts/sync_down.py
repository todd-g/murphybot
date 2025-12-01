#!/usr/bin/env python3
"""
sync_down.py - Pull notes from Convex to local markdown files

This script:
1. Connects to Convex via HTTP API
2. Fetches all notes with version info
3. Compares against local sync state
4. Downloads/updates only changed notes
5. Preserves JD folder structure

For the app-first architecture, Convex is the source of truth.
This script syncs DOWN to local for Obsidian access.

Usage:
    python sync_down.py              # Sync all notes
    python sync_down.py --force      # Force overwrite all local files
"""

import os
import sys
import json
import httpx
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL") or os.getenv("CONVEX_URL")
REPO_ROOT = Path(__file__).parent.parent
SECOND_BRAIN = REPO_ROOT / "second-brain"
SYNC_STATE_FILE = SECOND_BRAIN / "_sync_state.json"

# JD folder mapping
JD_FOLDERS = {
    "0": "00-index",
    "1": "10-reference",
    "2": "20-projects",
    "3": "30-people",
    "4": "40-media",
    "5": "50-events",
    "6": "60-ideas",
    "7": "70-home",
    "8": "80-personal",
    "9": "90-archive",
}


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


def fetch_all_notes(client: httpx.Client) -> list[dict]:
    """Fetch all notes from Convex with version info."""
    response = client.post(
        f"{CONVEX_URL}/api/query",
        json={
            "path": "notes:getForSync",
            "args": {},
        },
    )
    response.raise_for_status()
    result = response.json()
    
    if "value" in result:
        return result["value"]
    return []


def generate_frontmatter(note: dict) -> str:
    """Generate YAML frontmatter for a note."""
    frontmatter = {
        "jdId": note["jdId"],
        "title": note["title"],
        "version": note.get("version", 1),
        "synced_at": datetime.utcnow().isoformat(),
    }
    
    lines = ["---"]
    for key, value in frontmatter.items():
        if isinstance(value, str):
            # Escape quotes in strings
            escaped = value.replace('"', '\\"')
            lines.append(f'{key}: "{escaped}"')
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    
    return "\n".join(lines)


def write_note_file(note: dict, force: bool = False) -> tuple[str, bool]:
    """
    Write a note to a local markdown file.
    Returns (action, success) where action is 'created', 'updated', or 'skipped'.
    """
    path = note["path"]
    filepath = SECOND_BRAIN / path
    
    # Ensure the directory exists
    filepath.parent.mkdir(parents=True, exist_ok=True)
    
    # Check if file exists and compare versions
    if filepath.exists() and not force:
        # For now, just overwrite - we'll handle conflicts in sync_notes.py
        pass
    
    # Build the full content with frontmatter
    frontmatter = generate_frontmatter(note)
    content = note["content"]
    
    # Remove any existing frontmatter from content (in case it was synced before)
    if content.startswith("---"):
        # Find the closing ---
        end_idx = content.find("---", 3)
        if end_idx != -1:
            content = content[end_idx + 3:].lstrip("\n")
    
    full_content = f"{frontmatter}\n\n{content}"
    
    action = "updated" if filepath.exists() else "created"
    
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(full_content)
        return action, True
    except Exception as e:
        print(f"  [!] Error writing {path}: {e}")
        return "error", False


def remove_orphaned_files(remote_paths: set[str], state: dict) -> int:
    """Remove local files that no longer exist in Convex."""
    removed = 0
    synced_paths = set(state.get("notes", {}).keys())
    
    orphaned = synced_paths - remote_paths
    for path in orphaned:
        filepath = SECOND_BRAIN / path
        if filepath.exists():
            try:
                filepath.unlink()
                print(f"  [-] Removed orphaned: {path}")
                removed += 1
            except Exception as e:
                print(f"  [!] Error removing {path}: {e}")
    
    return removed


def main():
    """Main sync function."""
    force = "--force" in sys.argv
    
    if not CONVEX_URL:
        print("Error: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable not set")
        print("Please set it in your .env file or environment")
        sys.exit(1)
    
    print(f"Connecting to Convex: {CONVEX_URL}")
    if force:
        print("Force mode: will overwrite all local files")
    
    # Load current sync state
    state = load_sync_state()
    last_sync = state.get("last_sync")
    if last_sync:
        print(f"Last sync: {last_sync}")
    
    with httpx.Client(timeout=30.0) as client:
        # Fetch all notes from Convex
        print("Fetching notes from Convex...")
        notes = fetch_all_notes(client)
        
        if not notes:
            print("No notes found in Convex.")
            return
        
        print(f"Found {len(notes)} note(s) in Convex.")
        
        created = 0
        updated = 0
        skipped = 0
        errors = 0
        
        remote_paths = set()
        new_state = {"notes": {}, "last_sync": None}
        
        for note in notes:
            path = note["path"]
            version = note.get("version", 1)
            remote_paths.add(path)
            
            # Check if we need to update
            local_version = state.get("notes", {}).get(path, {}).get("version", 0)
            
            if not force and local_version >= version:
                # Already up to date
                new_state["notes"][path] = state["notes"].get(path, {"version": version})
                skipped += 1
                continue
            
            # Write the file
            action, success = write_note_file(note, force)
            
            if success:
                new_state["notes"][path] = {
                    "version": version,
                    "synced_at": datetime.utcnow().isoformat(),
                }
                
                if action == "created":
                    created += 1
                    print(f"  [+] Created: {path}")
                elif action == "updated":
                    updated += 1
                    print(f"  [~] Updated: {path} (v{local_version} -> v{version})")
            else:
                errors += 1
                # Keep old state on error
                if path in state.get("notes", {}):
                    new_state["notes"][path] = state["notes"][path]
        
        # Remove orphaned local files
        removed = remove_orphaned_files(remote_paths, state)
        
        # Save new sync state
        save_sync_state(new_state)
        
        print()
        print(f"Sync complete!")
        print(f"  Created: {created}")
        print(f"  Updated: {updated}")
        print(f"  Skipped: {skipped}")
        print(f"  Removed: {removed}")
        if errors:
            print(f"  Errors: {errors}")


if __name__ == "__main__":
    main()

