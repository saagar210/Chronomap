<p align="center">
  <img src="https://img.shields.io/badge/Tauri_2-FFC131?style=for-the-badge&logo=tauri&logoColor=333" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=333" alt="React 19" />
  <img src="https://img.shields.io/badge/Rust-000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Ollama-111?style=for-the-badge" alt="Ollama" />
</p>

# ChronoMap

### A local-first desktop studio for turning messy research into living, navigable timelines.

ChronoMap is for the moment when a topic gets too big for notes, too tangled for spreadsheets, and too interesting to leave flattened into a list.

Open a blank canvas. Drop in milestones, ranges, eras, and connected events. Zoom from centuries to single days. Pull in AI-assisted suggestions from a local Ollama model. Import real data, export polished artifacts, and keep everything on your machine.

**If you want to map the history of a company, a product, a war, a scientific field, a personal journey, or an entire fictional universe, ChronoMap is built for that kind of thinking.**

---

## Why it feels different

Most timeline tools treat time like a static report.

ChronoMap treats time like a space you can explore.

- Create timelines on an infinite, zoomable canvas
- Organize stories into color-coded parallel tracks
- Link related events so causes, echoes, and dependencies become visible
- Ask a local AI assistant to suggest missing events, generate descriptions, or fact-check details
- Search, filter, and reshape your timeline without losing the bigger picture

This is not just a place to store dates. It is a place to think with them.

---

## What you can do with ChronoMap

### Build timelines that actually breathe

- Add **point**, **range**, **milestone**, and **era** events
- Drag events across time and tracks
- Zoom from a birds-eye historical view down to fine-grained detail
- Draw visual connections between related moments
- Multi-select, bulk edit, and use undo/redo while you explore

### Turn research into structure faster

- Start from a blank timeline or one of the built-in templates
- Import timeline data from JSON or CSV
- Search with SQLite FTS5 and jump straight to matching events
- Filter by track, event type, importance, date range, tags, or AI-generated status

### Use AI without giving up privacy

- Connect to **Ollama** running locally
- Ask for event suggestions on a topic
- Fill gaps in an existing timeline
- Generate descriptions for sparse events
- Suggest connections between moments
- Chat with an assistant that can use current timeline context
- Test your AI connection and model settings inside the app

### Export something worth sharing

- Export to **JSON**, **CSV**, and **Markdown**
- Generate **PNG**, **SVG**, and **PDF** output
- Keep a structured working file while still shipping polished deliverables

---

## Who this is for

ChronoMap is especially useful for:

- researchers and students
- writers and worldbuilders
- historians and documentary-minded teams
- founders mapping company or product history
- PMs exploring roadmap evolution
- anyone who thinks better when time becomes visual

---

## The experience in one minute

1. Create a blank timeline or pick a template.
2. Add tracks like "People", "Products", "Wars", "Releases", or "Funding".
3. Drop in a few anchor events.
4. Ask the AI assistant to suggest what is missing.
5. Connect related moments.
6. Zoom out and suddenly the whole story starts making sense.

That is the core magic of ChronoMap: it helps patterns emerge.

---

## Core highlights

### Canvas and navigation

- Infinite zoom with adaptive axis labels
- Smooth zoom animation and responsive canvas rendering
- Level-of-detail rendering that changes based on zoom
- Quick-create flow for adding events fast
- Pan, select, drag, and inspect without leaving the main workspace

### Organization and editing

- Track management with reordering and visibility control
- Command palette for fast action access
- Detail panel editing
- Context menus and keyboard shortcuts
- Toast feedback and collapsible workspace panels

### AI assistant

- Local Ollama-backed suggestions and chat
- Structured event generation
- Timeline-aware prompts
- Fact-checking and connection suggestion flows
- Settings panel for host and model configuration

### Import, templates, and exports

- JSON import/export for full fidelity
- CSV import with mapping flow
- Built-in starter templates
- Markdown, image, SVG, and PDF export paths

---

## Built-in templates

- Blank Timeline
- Project Timeline
- Company History
- Personal Biography
- Historical Period
- Product Roadmap

These are designed to get you past the empty-canvas moment quickly.

---

## Local-first by design

ChronoMap is a native desktop app built with **Tauri 2**, **React 19**, **Rust**, and **SQLite**.

Your timelines live locally. AI can be local too. That means:

- no mandatory cloud dependency
- lower latency for interactive editing
- better privacy for sensitive research
- a tool that still feels like a real desktop app, not a web page in disguise

---

## Quick start

### Prerequisites

| Tool    | Version           | Link                              |
| ------- | ----------------- | --------------------------------- |
| Rust    | 1.75+             | [rustup.rs](https://rustup.rs/)   |
| Node.js | 20+               | [nodejs.org](https://nodejs.org/) |
| pnpm    | 9+                | [pnpm.io](https://pnpm.io/)       |
| Ollama  | Latest (optional) | [ollama.ai](https://ollama.ai/)   |

### Run in development

```bash
git clone https://github.com/saagar210/Chronomap.git
cd Chronomap
pnpm install
pnpm tauri dev
```

### Lean dev mode

```bash
pnpm lean:dev
```

Use `lean:dev` when you want a smaller local disk footprint and are okay with slower restarts.

### Build for production

```bash
pnpm tauri build
```

---

## Contributor commands

### Verification

```bash
pnpm test:e2e
pnpm ai:eval
pnpm verify
```

### Release-oriented checks

```bash
pnpm release:check-secrets
pnpm release:rc:dry-run
pnpm release:readiness
```

### Cleanup

```bash
pnpm clean:heavy
pnpm clean:full
```

---

## Keyboard shortcuts

| Shortcut          | Action                   |
| ----------------- | ------------------------ |
| `Cmd+K`           | Command palette          |
| `Cmd+Z`           | Undo                     |
| `Cmd+Shift+Z`     | Redo                     |
| `Cmd+F`           | Focus search             |
| `Cmd+N`           | New event                |
| `Cmd+D`           | Duplicate selected event |
| `Cmd+0`           | Fit all events           |
| `Cmd+=` / `Cmd+-` | Zoom in / out            |
| `Space`           | Toggle AI panel          |
| `Delete`          | Delete selected event(s) |
| `Escape`          | Deselect / close         |

---

## Tech stack

- **Runtime:** Tauri 2
- **Frontend:** React 19 + TypeScript
- **Backend:** Rust
- **Data layer:** SQLite with WAL and FTS5
- **State:** Zustand
- **Build:** Vite 7
- **AI:** Ollama
- **Exports:** SVG, PDF, image, and structured data formats

---

## Status

ChronoMap is already a substantial desktop app with a real editing surface, local persistence, AI integration, import/export flows, and verification tooling. It is still evolving, but it is far beyond a scaffold.

If you care about timelines as a thinking tool, this is a project worth trying.

---

## License

MIT

---

<p align="center">
  <em>ChronoMap is built for people who want to see the shape of a story, not just read the dates.</em>
</p>
