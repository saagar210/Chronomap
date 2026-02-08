CREATE TABLE IF NOT EXISTS timelines (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY NOT NULL,
    timeline_id TEXT NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tracks_timeline ON tracks(timeline_id);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY NOT NULL,
    timeline_id TEXT NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL,
    end_date TEXT,
    event_type TEXT NOT NULL DEFAULT 'point',
    importance INTEGER NOT NULL DEFAULT 3,
    color TEXT,
    icon TEXT,
    image_path TEXT,
    external_link TEXT,
    tags TEXT NOT NULL DEFAULT '',
    source TEXT,
    ai_generated INTEGER NOT NULL DEFAULT 0,
    ai_confidence REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_events_timeline ON events(timeline_id);
CREATE INDEX IF NOT EXISTS idx_events_track ON events(track_id);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);

CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY NOT NULL,
    timeline_id TEXT NOT NULL REFERENCES timelines(id) ON DELETE CASCADE,
    source_event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    target_event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    connection_type TEXT NOT NULL DEFAULT 'related',
    label TEXT,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_connections_timeline ON connections(timeline_id);
CREATE INDEX IF NOT EXISTS idx_connections_source ON connections(source_event_id);
CREATE INDEX IF NOT EXISTS idx_connections_target ON connections(target_event_id);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'system');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_model', 'llama3.2');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ai_host', 'http://localhost:11434');
