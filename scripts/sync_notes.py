#!/usr/bin/env python3
"""
sync_notes.py - Push markdown notes to Convex

This script:
1. Scans JD folders for .md files
2. Parses each file for frontmatter (jdId, title)
3. Upserts to Convex notes table
4. Can be run manually or via pre-commit hook

Usage:
    python sync_notes.py              # Sync all notes
    python sync_notes.py file1.md ... # Sync specific files
"""

import os
import sys
import re
import httpx
from pathlib import Path
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


def get_relative_path(filepath: Path) -> str:
    """Get path relative to second-brain folder."""
    try:
        return str(filepath.relative_to(SECOND_BRAIN))
    except ValueError:
        return str(filepath)


def sync_note(client: httpx.Client, filepath: Path) -> dict:
    """Sync a single note to Convex."""
    # Read and parse the file
    with open(filepath, "r", encoding="utf-8") as f:
        content = frontmatter.load(f)
    
    # Extract metadata
    jd_id = extract_jd_id(filepath, content)
    title = extract_title(filepath, content)
    relative_path = get_relative_path(filepath)
    
    # Prepare the full content (including frontmatter rendered back)
    full_content = content.content
    
    # Call Convex upsert
    response = client.post(
        f"{CONVEX_URL}/api/mutation",
        json={
            "path": "notes:upsert",
            "args": {
                "jdId": jd_id,
                "path": relative_path,
                "title": title,
                "content": full_content,
            },
        },
    )
    response.raise_for_status()
    result = response.json()
    
    return {
        "path": relative_path,
        "jdId": jd_id,
        "title": title,
        "action": result.get("value", {}).get("action", "unknown"),
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
    if not CONVEX_URL:
        print("Error: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable not set")
        print("Please set it in your .env file or environment")
        sys.exit(1)
    
    # Determine which files to sync
    if len(sys.argv) > 1:
        # Sync specific files
        files = [Path(f) for f in sys.argv[1:] if f.endswith(".md")]
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
    
    with httpx.Client(timeout=30.0) as client:
        created = 0
        updated = 0
        errors = 0
        
        for filepath in files:
            try:
                result = sync_note(client, filepath)
                action = result["action"]
                
                if action == "created":
                    created += 1
                    print(f"  [+] {result['path']} ({result['jdId']})")
                elif action == "updated":
                    updated += 1
                    print(f"  [~] {result['path']} ({result['jdId']})")
                else:
                    print(f"  [?] {result['path']} ({action})")
            except Exception as e:
                errors += 1
                print(f"  [!] Error syncing {filepath}: {e}")
        
        print()
        print(f"Done! Created: {created}, Updated: {updated}, Errors: {errors}")


if __name__ == "__main__":
    main()

