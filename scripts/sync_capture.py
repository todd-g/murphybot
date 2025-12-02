#!/usr/bin/env python3
"""
sync_capture.py - Pull captures from Convex to local inbox

This script:
1. Connects to Convex via HTTP API
2. Fetches unsynced captures from capture_queue
3. For each capture:
   - Generates an ID: cap_XXXX
   - Writes a stub to inbox/new/{timestamp}-{id}.md
   - Downloads any attached files to inbox/assets/
4. Marks captures as synced in Convex
"""

import os
import sys
import json
import httpx
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL") or os.getenv("CONVEX_URL")
REPO_ROOT = Path(__file__).parent.parent
INBOX_NEW = REPO_ROOT / "second-brain" / "inbox" / "new"
INBOX_ASSETS = REPO_ROOT / "second-brain" / "inbox" / "assets"
STATE_FILE = REPO_ROOT / "second-brain" / "_state.json"


def get_next_capture_id() -> str:
    """Generate the next capture ID (cap_XXXX)."""
    state = load_state()
    next_num = state.get("next_capture_num", 1)
    return f"cap_{next_num:04d}"


def load_state() -> dict:
    """Load state from _state.json."""
    if STATE_FILE.exists():
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {"next_capture_num": 1}


def save_state(state: dict) -> None:
    """Save state to _state.json."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def fetch_unsynced_captures(client: httpx.Client) -> list[dict]:
    """Fetch unsynced captures from Convex."""
    response = client.post(
        f"{CONVEX_URL}/api/query",
        json={
            "path": "captures:getUnsynced",
            "args": {},
        },
    )
    response.raise_for_status()
    result = response.json()
    
    if "value" in result:
        return result["value"]
    return []


def mark_captures_synced(client: httpx.Client, ids: list[str]) -> None:
    """Mark captures as synced in Convex."""
    if not ids:
        return
    
    response = client.post(
        f"{CONVEX_URL}/api/mutation",
        json={
            "path": "captures:markSynced",
            "args": {"ids": ids},
        },
    )
    response.raise_for_status()


def download_file(client: httpx.Client, url: str, filename: str) -> Path:
    """Download a file from URL to inbox/assets/."""
    INBOX_ASSETS.mkdir(parents=True, exist_ok=True)
    
    response = client.get(url)
    response.raise_for_status()
    
    filepath = INBOX_ASSETS / filename
    with open(filepath, "wb") as f:
        f.write(response.content)
    
    return filepath


def create_capture_stub(capture: dict, capture_id: str) -> Path:
    """Create a markdown stub for a capture in inbox/new/."""
    INBOX_NEW.mkdir(parents=True, exist_ok=True)
    
    # Parse timestamp
    created_at = datetime.fromtimestamp(capture["createdAt"] / 1000)
    timestamp_str = created_at.strftime("%Y-%m-%dT%H-%M-%SZ")
    
    # Build frontmatter
    frontmatter = {
        "id": capture_id,
        "captured_at": created_at.isoformat(),
        "source": capture.get("source", "unknown"),
        "content_type": capture.get("contentType", "text"),
    }
    
    # Handle file URL if present
    if capture.get("fileUrl"):
        # Extract filename from URL or generate one
        file_ext = ".jpg"  # Default extension
        if "." in capture["fileUrl"].split("/")[-1]:
            file_ext = "." + capture["fileUrl"].split(".")[-1].split("?")[0]
        
        asset_filename = f"{capture_id}{file_ext}"
        frontmatter["assets"] = [f"../assets/{asset_filename}"]
    
    # Build markdown content
    text = capture.get("text", "")
    if not text:
        text = f"[Capture from {capture.get('source', 'unknown')}]"
    
    # Create the stub file
    filename = f"{timestamp_str}-{capture_id}.md"
    filepath = INBOX_NEW / filename
    
    # Write the file
    frontmatter_yaml = "\n".join(f"{k}: {json.dumps(v) if isinstance(v, list) else v}" 
                                  for k, v in frontmatter.items())
    
    content = f"""---
{frontmatter_yaml}
---

{text}
"""
    
    with open(filepath, "w") as f:
        f.write(content)
    
    return filepath


def main():
    """Main sync function."""
    if not CONVEX_URL:
        print("Error: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable not set")
        print("Please set it in your .env file or environment")
        sys.exit(1)
    
    print(f"Connecting to Convex: {CONVEX_URL}")
    
    with httpx.Client(timeout=30.0) as client:
        # Fetch unsynced captures
        print("Fetching unsynced captures...")
        captures = fetch_unsynced_captures(client)
        
        if not captures:
            print("No new captures to sync.")
            return
        
        print(f"Found {len(captures)} capture(s) to sync.")
        
        # Load state
        state = load_state()
        synced_ids = []
        
        for capture in captures:
            # Generate capture ID
            capture_id = f"cap_{state['next_capture_num']:04d}"
            state["next_capture_num"] += 1
            
            print(f"Processing {capture_id}...")
            
            # Download file if present
            if capture.get("fileUrl"):
                try:
                    file_ext = ".jpg"
                    if "." in capture["fileUrl"].split("/")[-1]:
                        file_ext = "." + capture["fileUrl"].split(".")[-1].split("?")[0]
                    
                    asset_filename = f"{capture_id}{file_ext}"
                    download_file(client, capture["fileUrl"], asset_filename)
                    print(f"  Downloaded asset: {asset_filename}")
                except Exception as e:
                    print(f"  Warning: Failed to download file: {e}")
            
            # Create stub
            stub_path = create_capture_stub(capture, capture_id)
            print(f"  Created stub: {stub_path.name}")
            
            # Track for syncing
            synced_ids.append(capture["_id"])
        
        # Save state
        save_state(state)
        
        # Mark as synced in Convex
        print("Marking captures as synced...")
        mark_captures_synced(client, synced_ids)
        
        print(f"Done! Synced {len(synced_ids)} capture(s).")
        print(f"Check inbox/new/ for new items to process.")


if __name__ == "__main__":
    main()



