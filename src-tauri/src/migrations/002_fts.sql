CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
    title,
    description,
    tags,
    content='events',
    content_rowid='rowid'
);

-- Populate FTS from existing data
INSERT OR IGNORE INTO events_fts(rowid, title, description, tags)
    SELECT rowid, title, description, tags FROM events;

-- Keep FTS in sync
CREATE TRIGGER IF NOT EXISTS events_fts_insert AFTER INSERT ON events BEGIN
    INSERT INTO events_fts(rowid, title, description, tags)
        VALUES (new.rowid, new.title, new.description, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS events_fts_delete AFTER DELETE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, title, description, tags)
        VALUES ('delete', old.rowid, old.title, old.description, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS events_fts_update AFTER UPDATE ON events BEGIN
    INSERT INTO events_fts(events_fts, rowid, title, description, tags)
        VALUES ('delete', old.rowid, old.title, old.description, old.tags);
    INSERT INTO events_fts(rowid, title, description, tags)
        VALUES (new.rowid, new.title, new.description, new.tags);
END;
