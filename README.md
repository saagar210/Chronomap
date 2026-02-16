<p align="center">
  <img src="https://img.shields.io/badge/Tauri_2-FFC131?style=for-the-badge&logo=tauri&logoColor=333" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=333" alt="React 19" />
  <img src="https://img.shields.io/badge/Rust-000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind 4" />
</p>

# ChronoMap

### Build beautiful, interactive timelines — powered by local AI.

ChronoMap is a native desktop app for creating rich, zoomable timelines with an AI research assistant. Built with Tauri 2 + React + Rust + SQLite. **Your data never leaves your machine.**

---

## Why ChronoMap?

Ever tried mapping out the history of something — a war, a company, a technology — and wished you had a tool that was more than just a flat list? ChronoMap gives you an infinite, zoomable canvas where you can **see** time unfold. Drag events around. Draw connections between moments. Let AI fill in the gaps you didn't know existed.

---

## Core Features

### Timeline Canvas
- **Infinite zoom** from centuries down to hours, with adaptive axis labels
- **Smooth zoom animation** with lerp-based transitions
- **Level-of-detail rendering:** dots at far zoom, labels at medium, full detail up close
- **Four event types:** point, range, milestone, and era (translucent background bands)
- **Drag to move** events across dates and tracks
- **Bezier curve connections** between related events, styled by relationship type
- **Multi-select** via Shift+click or rubber-band box select
- **Quick create** — double-click empty space to add an event instantly
- **60fps rendering** with Canvas 2D, tested with 5,000+ events

### AI Research Assistant (Ollama)
- **Research any topic** — ask the AI and get structured timeline events back
- **Fill gaps** in your timeline with AI-suggested events
- **Batch add** AI suggestions — add all or cherry-pick with checkboxes
- **Generate descriptions** for events with one click
- **Suggest connections** between related events
- **Fact-check** events against the AI's knowledge (right-click context menu)
- **Chat** with a context-aware research assistant (auto-includes timeline context)
- **Configurable** — set Ollama host, choose model, test connection from settings

### Import & Export
- **Import:** JSON (full timeline), CSV (with column mapping UI)
- **Export:** JSON, CSV, Markdown, PNG (1x/2x/3x resolution), SVG, PDF (cover page + timeline pages)

### Organization
- **Tracks:** Color-coded parallel lanes with drag-and-drop reorder and visibility toggle
- **Search:** Full-text search powered by SQLite FTS5 — click a result to pan the canvas to it
- **Filter:** By track, event type, importance, date range, tags, or AI-generated status
- **Templates:** 6 built-in templates + save your own
- **Command palette** (`Cmd+K`) — fuzzy search for any action, event, or timeline

### Quality of Life
- **Undo / Redo** (`Cmd+Z` / `Cmd+Shift+Z`) for all event, track, and connection operations
- **Toast notifications** for success, error, and info feedback
- **Bulk actions** — select multiple events and change track, color, importance, or delete
- **Dark / Light / System** theme
- **Keyboard shortcuts** for everything (see below)
- **Right-click context menu** with edit, duplicate, delete, connect, fact-check
- **Collapsible sidebar** for a wider canvas
- **Welcome screen** with Create Blank, Use Template, and Import options

---

## Quick Start

### Prerequisites

| Tool | Version | Link |
|------|---------|------|
| Rust | 1.75+ | [rustup.rs](https://rustup.rs/) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| pnpm | 9+ | [pnpm.io](https://pnpm.io/) |
| Ollama | Latest (optional) | [ollama.ai](https://ollama.ai/) |

### Run in Development

Normal dev mode (faster restarts, keeps local build artifacts):

```bash
git clone https://github.com/saagar210/Chronomap.git
cd Chronomap
pnpm install
pnpm tauri dev
```

Lean dev mode (minimizes repo disk growth, cleans heavy artifacts on exit):

```bash
pnpm lean:dev
```

### Build for Production

```bash
pnpm tauri build
# -> src-tauri/target/release/bundle/dmg/ChronoMap_0.1.0_aarch64.dmg (5.3 MB)
```

### Cleanup Commands

```bash
# Remove heavy build artifacts only (safe default)
pnpm clean:heavy

# Remove all reproducible local caches (includes node_modules)
pnpm clean:full
```

`pnpm clean` remains an alias for `pnpm clean:heavy`.  
`pnpm clean:deep` remains an alias for `pnpm clean:full`.

### Normal vs Lean Tradeoffs

- `pnpm tauri dev`: uses persistent local caches (`src-tauri/target`, `node_modules/.vite`) for faster subsequent startup/rebuilds, but uses more disk.
- `pnpm lean:dev`: routes Rust + Vite build caches to temporary folders and runs heavy cleanup when the app exits, which keeps repo disk usage lower but makes each startup slower.
- Dependency caches are preserved for practical speed (`node_modules` stays unless you run `pnpm clean:full`).

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+F` | Focus search |
| `Cmd+N` | New event |
| `Cmd+D` | Duplicate selected event |
| `Cmd+0` | Fit all events |
| `Cmd+=` / `Cmd+-` | Zoom in / out |
| `Space` | Toggle AI panel |
| `Delete` | Delete selected event(s) |
| `Escape` | Deselect / close |
| `Shift+Click` | Multi-select events |
| `Shift+Drag` | Box select |
| Scroll wheel | Zoom centered on cursor |
| Click + drag (empty) | Pan canvas |
| Click + drag (event) | Move event |
| Double-click (empty) | Quick create event |
| Double-click (event) | Open editor |
| Right-click event | Context menu |

---

## Architecture

```
src/                          # React 19 + TypeScript (strict mode)
  components/                 #   Canvas renderer, layout, AI panel, search, etc.
  stores/                     #   9 independent Zustand stores
  hooks/                      #   Canvas rendering, zoom/pan, keyboard shortcuts
  lib/                        #   Types, IPC commands, date math, utilities

src-tauri/src/                # Rust backend
  commands/                   #   ~47 Tauri IPC commands
  db/                         #   SQLite with WAL, 3 migrations, FTS5
  ai/                         #   Ollama HTTP client + prompt templates
  export/                     #   SVG + PDF generation
```

**State management:** 9 independent Zustand stores with no circular dependencies. Canvas reads from stores via `getState()` to avoid React re-render overhead during rendering.

**Rendering:** Canvas 2D with `requestAnimationFrame` loop and dirty-flag optimization. Smooth zoom via lerp animation. Level-of-detail rendering adjusts visual complexity based on zoom level. Only redraws when data or viewport changes.

**Data:** Everything lives in a local SQLite database with WAL mode, foreign key enforcement, and FTS5 full-text search.

---

## Verification

```bash
# Rust tests
cd src-tauri && cargo test --lib

# Lint checks
cd src-tauri && cargo clippy -- -D warnings
pnpm exec tsc --noEmit
```

---

## Built-in Templates

| Template | Tracks |
|----------|--------|
| Blank Timeline | Default |
| Project Timeline | Milestones, Tasks, Deadlines, Reviews |
| Company History | Founding, Products, People, Funding |
| Personal Biography | Education, Career, Personal, Travel |
| Historical Period | Politics, Science, Culture, Wars |
| Product Roadmap | Features, Bugs, Releases, Research |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Tauri 2](https://tauri.app/) |
| Frontend | React 19, TypeScript 5.8 (strict), Tailwind CSS 4 |
| State | [Zustand](https://zustand-demo.pmnd.rs/) |
| Backend | Rust, [rusqlite](https://github.com/rusqlite/rusqlite) (bundled) |
| AI | [Ollama](https://ollama.ai/) (local, optional) |
| PDF Export | [printpdf](https://github.com/nickkjolsing/printpdf) 0.7 |
| Command Palette | [cmdk](https://cmdk.paco.me/) |
| Build | Vite 7 |
| File dialogs | [rfd](https://github.com/PolyMeilex/rfd) |

---

## License

MIT

---

<p align="center">
  <em>Built with Tauri, React, Rust, and a healthy obsession with timelines.</em>
</p>
