# MurphyBot - Second Brain System

A local-first, AI-assisted second brain using Obsidian, Markdown, Johnny.Decimal organization, and a Convex/Vercel "Ask My Brain" app.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOCAL (Your Machine)                        │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │  Obsidian   │◄──►│  Git Repo    │◄──►│  Cursor + Claude      │  │
│  │  (Edit/View)│    │  (JD folders)│    │  (Process inbox)      │  │
│  └─────────────┘    └──────────────┘    └───────────────────────┘  │
│                            │                                        │
│         ┌──────────────────┼──────────────────┐                    │
│         │                  │                  │                    │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌─────▼─────┐              │
│  │sync_capture │    │  sync_notes │    │pre-commit │              │
│  │    .py      │    │     .py     │    │   hook    │              │
│  └─────────────┘    └─────────────┘    └───────────┘              │
└─────────────────────────────────────────────────────────────────────┘
          │                  │                 │
          ▼                  ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           CLOUD                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      Convex Backend                          │   │
│  │  ┌─────────────────┐    ┌─────────────────┐                 │   │
│  │  │ capture_queue   │    │     notes       │                 │   │
│  │  │ (raw inputs)    │    │ (synced from MD)│                 │   │
│  │  └─────────────────┘    └─────────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ▲                                      │
│  ┌───────────────────────────┴───────────────────────────────────┐ │
│  │              Next.js App (Vercel)                              │ │
│  │  ┌──────────────────┐    ┌─────────────────────────────────┐  │ │
│  │  │  Capture Form    │    │  "Ask My Brain" + Claude API    │  │ │
│  │  └──────────────────┘    └─────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Johnny.Decimal Structure

Your notes are organized using the [Johnny.Decimal](https://johnnydecimal.com/) system:

| Area | Description |
|------|-------------|
| **00-09** | Index & System Meta |
| **10-19** | Reference Materials |
| **20-29** | Projects |
| **30-39** | People |
| **40-49** | Media (Books, Movies, etc.) |
| **50-59** | Events |
| **60-69** | Ideas & Brainstorms |
| **70-79** | Home & Household |
| **80-89** | Personal |
| **90-99** | Archive |

## Quick Start

### 1. Set up Obsidian

Point your Obsidian vault at the `second-brain/` folder.

### 2. Set up Convex

```bash
cd app
npm install
npx convex dev
```

Follow the prompts to create a new Convex project. Copy the deployment URL.

### 3. Configure Environment

Create `app/.env`:

```bash
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Set up Python Scripts

```bash
pip install -r scripts/requirements.txt
```

### 5. Install Git Hooks

```bash
./scripts/install-hooks.sh
```

### 6. Run the Web App

```bash
cd app
npm run dev
```

## Daily Workflow

1. **Capture** - Use the web app to capture thoughts from your phone
2. **Sync** - Run `python scripts/sync_capture.py` to pull captures to `inbox/new/`
3. **Process** - Open Cursor and use Claude to categorize items:
   
   > "Review all files in `inbox/new`. For each, propose a JD destination and draft the final markdown."

4. **Organize** - Move processed stubs to `inbox/processed/`
5. **Commit** - Git commit triggers automatic Convex sync
6. **Query** - Use "Ask My Brain" to search your knowledge anytime

## Scripts

### `sync_capture.py`

Pulls unsynced captures from Convex to `inbox/new/`.

```bash
python scripts/sync_capture.py
```

### `sync_notes.py`

Pushes markdown notes to Convex for searching.

```bash
# Sync all notes
python scripts/sync_notes.py

# Sync specific files
python scripts/sync_notes.py second-brain/30-people/30.01-family.md
```

### Pre-commit Hook

Automatically syncs staged markdown files to Convex before each commit.

## Tech Stack

- **Local**: Obsidian + Markdown + Git
- **Backend**: Convex (database + functions)
- **Frontend**: Next.js + Tailwind + shadcn
- **AI**: Claude API (Anthropic)
- **Scripts**: Python 3.10+

## License

MIT

