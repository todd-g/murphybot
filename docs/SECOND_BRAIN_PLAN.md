# SECOND BRAIN PLAN — Todd’s Local-First, JD-Organized, AI-Assisted System

_A lightweight second brain pipeline using Obsidian, Markdown, Johnny.Decimal, and a remote → local inbox workflow, with a Convex/Vercel “Ask My Brain” app._

---

## 1. System Overview

Your second brain is built around:

- **Local Markdown repo** (source of truth)
- **Obsidian** (local editing & browsing)
- **Johnny.Decimal (JD) structure** (stable categories and predictable placement)
- **A remote capture bucket** (simple, dumb input from phone/web)
- **Local Python sync script** (downloads remote captures → `inbox/new/`)
- **Claude in Cursor** (categorization & processing logic)
- **A file-system-native inbox** (queue = files in a folder)
- **Convex + Vercel “Ask My Brain” app** (query and remote capture UI)
- **MD → Convex sync script** (keeps Convex in line with the repo, e.g. via pre-commit hook)

Everything important lives as Markdown in git.  
Convex is an index + query layer for the app.

---

## 2. Repo Structure

```text
second-brain/
  inbox/
    new/          # fresh captures (unprocessed queue)
    processed/    # archived capture stubs after processing
    assets/       # downloaded images/files attached to captures
  00-index/
  10-reference/
  20-projects/
  30-people/
  40-media/
  50-events/
  60-ideas/
  70-home/
  80-personal/
  90-archive/
  _state.json     # optional state for sync script
```

- **JD folders** hold finalized notes.
- **`inbox/`** is purely workflow (capture + processing).
- `_state.json` is optional and helps track last-synced capture from remote storage if needed.

You can later refine the exact JD map, but the structure above is the backbone.

---

## 3. Remote Capture Flow (Phone / Web App)

Remote capture is intentionally dumb. The app does **no classification**.

1. You snap a photo, paste text, dictate a note, or forward something.
2. The mobile/web app sends payload to a backend endpoint, e.g. `POST /capture` on Vercel.
3. The backend stores captures in a simple place (Convex table or object storage).

Example Convex table (if you want a capture log):

```ts
// capture_queue (optional, remote-side log only)
{
  _id: string,
  createdAt: Date,
  source: "ios-app" | "web" | "email" | "other",
  contentType: "text" | "image" | "url" | "file",
  text?: string,
  fileUrl?: string,
  meta?: any
}
```

But the **real queue for processing** will be files in `inbox/new/` in your repo.

---

## 4. Local Sync Script (`sync_capture.py`) → `inbox/new/`

When you’re on your computer and want to process new captures:

1. Run `sync_capture.py`.
2. It fetches **new remote captures** (from Convex or storage).
3. For each capture, it:
   - Generates an ID: `cap_0001`, `cap_0002`, etc.
   - Saves a Markdown stub in `inbox/new/`.
   - Downloads associated assets (images/files) to `inbox/assets/`.
4. Optionally updates `_state.json` with the last processed remote capture ID.

Example stub written to `inbox/new/2025-11-29T20-31-00Z-cap_0001.md`:

```md
---
id: cap_0001
captured_at: 2025-11-29T20:31:00Z
source: ios-app
content_type: image+text
assets:
  - ../assets/cap_0001.jpg
---

Screenshot of gymnastics flyer for January in Saugerties.
```

At this stage, nothing touches your JD folders. The notes are just queued for processing.

---

## 5. Processing the Inbox with Claude in Cursor

Processing logic lives **only locally**, in your workflow with Cursor/Claude.

Typical flow:

1. Run `sync_capture.py` (ensure `inbox/new/` is populated).
2. Open the repo in Cursor.
3. Ask Claude something like:

   > “Review all files in `inbox/new`. For each:
   > - summarize it in 1–2 lines,
   > - propose a Johnny.Decimal destination (e.g., 50.01 Local Events, 40.01 Movies, 30.01 People),
   > - draft the final markdown entry to add to that destination file,
   > - tell me exactly which file to edit.”

4. For each item, you approve or tweak:
   - JD destination (which folder/file).
   - The exact markdown snippet.

You then have Claude (or yourself) update the proper JD note.

Example final note in `50-events/50.01-local-events.md`:

```md
## Local Events

- **Gymnastics Trial Class – January**  
  *Location:* Saugerties, NY  
  *Details:* Free/low-cost trial for kids, Saturday mornings.  
  *Captured:* 2025-11-29 (cap_0001)
```

---

## 6. Moving Capture Stubs Out of the Queue

The queue mechanic is literally “what files are in `inbox/new/`?”

Once an item is processed:

1. Move the stub file from:

   ```text
   inbox/new/<timestamp>-cap_0001.md
   → inbox/processed/<timestamp>-cap_0001.md
   ```

2. Optionally, update the stub with its final destination path so you have a breadcrumb:

   ```md
   ---
   id: cap_0001
   captured_at: 2025-11-29T20:31:00Z
   source: ios-app
   content_type: image+text
   assets:
     - ../assets/cap_0001.jpg
   final_destination: "../50-events/50.01-local-events.md"
   ---
   ```

Now `inbox/new/` holds only **unprocessed** items.  
`inbox/processed/` is an archive / audit log of captures and where they ended up.

---

## 7. Commit & Push (Markdown as Source of Truth)

After processing your inbox:

1. Stage changes in git (new notes, updated notes, moved stubs, new assets).
2. Commit:
   ```bash
   git add .
   git commit -m "Process inbox items"
   git push
   ```

Your `second-brain` repo in GitHub is always the **canonical source of truth**.

---

## 8. MD → Convex Sync (for the Ask App)

The Convex DB is a **projection** of your repo for querying in the app.

You maintain a `notes` table in Convex, for example:

```ts
// notes
{
  _id: string,
  jdId: string,           // e.g. "50.01"
  path: string,           // e.g. "50-events/50.01-local-events.md"
  title: string,          // e.g. "Local Events"
  content: string,        // full markdown content
  updatedAt: Date,
  embedding?: number[]    // optional: for semantic search
}
```

### Sync Strategy (Pre-Commit or Post-Commit Hook)

You can keep `notes` in sync with the repo by:

- A **pre-commit** script that, before finalizing a commit:
  1. Scans for changed markdown files in JD folders.
  2. For each changed file, calls Convex to upsert a `notes` record.
- Or a **post-commit/post-push job** (e.g. GitHub Action) that:
  1. Detects changed files in the commit.
  2. Updates Convex accordingly.

Example high-level pre-commit hook steps:

1. Detect staged `.md` files under JD folders (e.g. `??-*/**/*.md`, excluding `inbox/`).
2. For each file:
   - Derive `jdId` from its folder/file name (e.g. `50-events/50.01-local-events.md` → `50.01`).
   - Read its content.
   - Call a script (Node or Python) that:
     - Sends `jdId`, `path`, `title`, `content` to Convex via an API/function.
3. Once Convex is updated for all changed notes, allow the commit to complete.

This keeps Convex tightly aligned with your repo, without making Convex the source of truth.

---

## 9. Vercel + Convex “Ask My Brain” App

The Ask app is **not optional** in this design; it’s a core interface for querying your brain when you’re away from your computer.

### Frontend (Vercel)

A small Next.js/React app with:

- **Ask form**:
  - A text field: “Ask your brain…”
  - Sends query to `/api/ask`

- **Capture form** (optional, if you want capture via web):
  - Text/textarea input
  - Optional file upload
  - Sends to `/api/capture` (which just stores raw capture for `sync_capture.py` later)

### Backend Flow for `/api/ask`

1. Receive JSON: `{ question: string }`
2. In Convex (or via a Convex function called from Vercel):
   - Search `notes` by:
     - JD range (e.g. 30–39 for people) if you hint that in the prompt, and/or
     - embeddings similarity.
3. Select a small set of relevant notes (paths + content).
4. Send those notes + the user’s question to Claude/OpenAI.
5. Return the generated answer to the frontend.

Example questions:

- “Who are Celine’s parents?”  
  → Convex finds `30-people/31.01-celine.md`

- “What local kids’ events are coming up in January?”  
  → Convex finds entries in `50.01-local-events.md`

- “What game mechanics did I jot down that involve totem stacks?”  
  → Convex surfaces relevant notes in `60-ideas/` by embeddings.

The user experience: **you can ask your brain from your phone**, and the answer is based on your curated Markdown.

---

## 10. Querying vs. Editing

- **Editing** is local-first:
  - You use Obsidian + Cursor to refactor, reorganize, and write content.
  - Git and your repo remain the canonical system.

- **Querying (“Ask My Brain”)** can happen anywhere:
  - The Vercel + Convex app uses the `notes` table synced from your repo.
  - It never *writes directly* to JD notes—only reads them.

- **Capture** from the app:
  - Can be done, but it only writes to a remote capture bucket/log.
  - `sync_capture.py` later pulls these down into `inbox/new/` for proper local processing.

This separation keeps things safe and understandable.

---

## 11. Why This Design Works Well for You

- ✅ **Local-first**: all content lives as Markdown in a git repo on your machine.
- ✅ **Single source of truth**: no confusion between DB vs. files.
- ✅ **JD structure**: predictable, AI-friendly organization.
- ✅ **Simple inbox**: queue is literally “files in `inbox/new/`”.
- ✅ **AI as a local assistant**: categorization and refactoring live in Cursor/Claude.
- ✅ **Vercel + Convex app**: lets you ask questions and (optionally) capture ideas from anywhere.
- ✅ **MD → Convex sync**: keeps the app’s view updated without making Convex authoritative.

Everything important remains transparent and inspectable as plain text.

---

## 12. Implementation Checklist (High-Level)

1. **Create repo**: `second-brain/` with folders above.
2. **Initialize Obsidian vault** pointing at the repo.
3. **Define initial JD map** (at least for People, Media, Events, Ideas).
4. **Build `sync_capture.py`**:
   - Pulls raw captures (if you choose to store them remotely)
   - Writes stubs to `inbox/new/` and assets to `inbox/assets/`.
5. **Set up Vercel + Convex app**:
   - `POST /api/ask` → Convex search → LLM answer.
   - Optional `POST /api/capture` → raw capture storage.
6. **Implement MD → Convex sync**:
   - Pre-commit script or post-commit job to upsert `notes` in Convex.
7. **Daily workflow**:
   - Run `sync_capture.py`.
   - Process everything in `inbox/new/` with Claude in Cursor.
   - Move processed stubs to `inbox/processed/`.
   - Commit & push.
   - Ask your brain from phone/web as needed.

You now have a **local-first, AI-enhanced, app-accessible second brain** with minimal moving parts and maximal transparency.
