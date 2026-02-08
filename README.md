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
- **Four event types:** point, range, milestone, and era (translucent background bands)
- **Drag to move** events across dates and tracks
- **Bezier curve connections** between related events
- **60fps rendering** with Canvas 2D, tested with 5,000+ events

### AI Research Assistant (Ollama)
- **Research any topic** — ask the AI and get structured timeline events back
- **Fill gaps** in your timeline with AI-suggested events
- **Generate descriptions** for events with one click
- **Suggest connections** between related events
- **Fact-check** events against the AI's knowledge
- **Chat** with a context-aware research assistant

### Import & Export
- **Import:** JSON (full timeline), CSV (with column mapping UI)
- **Export:** JSON, CSV, Markdown, PNG, SVG, PDF

### Organization
- **Tracks:** Color-coded parallel lanes with drag-and-drop reorder and visibility toggle
- **Search:** Full-text search powered by SQLite FTS5
- **Filter:** By track, event type, importance, or tags
- **Templates:** 6 built-in templates + save your own

### Quality of Life
- **Dark / Light / System** theme
- **Keyboard shortcuts** for everything (see below)
- **Right-click context menu** with edit, duplicate, delete
- **Auto-save** on field blur

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

```bash
git clone https://github.com/YOUR_USERNAME/Chronomap.git
cd Chronomap
pnpm install
pnpm tauri dev
```

### Build for Production

```bash
pnpm tauri build
# -> src-tauri/target/release/bundle/dmg/ChronoMap_0.1.0_aarch64.dmg (5.3 MB)
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+F` | Focus search |
| `Cmd+0` | Fit all events |
| `Cmd+=` / `Cmd+-` | Zoom in / out |
| `Delete` | Delete selected event |
| `Escape` | Deselect / close |
| Scroll wheel | Zoom centered on cursor |
| Click + drag (empty) | Pan canvas |
| Click + drag (event) | Move event |
| Right-click event | Context menu |
| Double-click event | Open editor |

---

## Architecture

```
src/                          # React 19 + TypeScript (strict mode)
  components/                 #   Canvas renderer, layout, AI panel, search, etc.
  stores/                     #   8 independent Zustand stores
  hooks/                      #   Canvas rendering, zoom/pan, keyboard shortcuts
  lib/                        #   Types, IPC commands, date math, utilities

src-tauri/src/                # Rust backend
  commands/                   #   ~43 Tauri IPC commands
  db/                         #   SQLite with WAL, 3 migrations, FTS5
  ai/                         #   Ollama HTTP client + prompt templates
```

**State management:** 8 independent Zustand stores with no circular dependencies. Canvas reads from stores via `getState()` to avoid React re-render overhead during rendering.

**Rendering:** Canvas 2D with `requestAnimationFrame` loop and dirty-flag optimization. Only redraws when data or viewport changes.

**Data:** Everything lives in a local SQLite database with WAL mode, foreign key enforcement, and FTS5 full-text search.

---

## Tests

```bash
# 35 Rust tests
cd src-tauri && cargo test --lib

# 104 frontend tests
pnpm test

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
| Build | Vite 7, Vitest 4 |
| File dialogs | [rfd](https://github.com/PolyMeilex/rfd) |

---

## License

MIT

---

<p align="center">
  <em>Built with Tauri, React, Rust, and a healthy obsession with timelines.</em>
</p>
