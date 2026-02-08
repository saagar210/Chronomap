CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    data TEXT NOT NULL DEFAULT '{}',
    is_builtin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO templates (id, name, description, data, is_builtin) VALUES
('tpl-blank', 'Blank Timeline', 'Start with a clean slate', '{"tracks":[{"name":"Default","color":"#3b82f6"}]}', 1),
('tpl-project', 'Project Timeline', 'Track project milestones and tasks', '{"tracks":[{"name":"Milestones","color":"#f59e0b"},{"name":"Tasks","color":"#3b82f6"},{"name":"Deadlines","color":"#ef4444"},{"name":"Reviews","color":"#10b981"}]}', 1),
('tpl-company', 'Company History', 'Document your company''s journey', '{"tracks":[{"name":"Founding","color":"#8b5cf6"},{"name":"Products","color":"#3b82f6"},{"name":"People","color":"#10b981"},{"name":"Funding","color":"#f59e0b"}]}', 1),
('tpl-biography', 'Personal Biography', 'Map out a life story', '{"tracks":[{"name":"Education","color":"#3b82f6"},{"name":"Career","color":"#10b981"},{"name":"Personal","color":"#ec4899"},{"name":"Travel","color":"#f97316"}]}', 1),
('tpl-history', 'Historical Period', 'Explore a period in history', '{"tracks":[{"name":"Politics","color":"#ef4444"},{"name":"Science","color":"#3b82f6"},{"name":"Culture","color":"#8b5cf6"},{"name":"Wars","color":"#f59e0b"}]}', 1),
('tpl-roadmap', 'Product Roadmap', 'Plan your product development', '{"tracks":[{"name":"Features","color":"#3b82f6"},{"name":"Bugs","color":"#ef4444"},{"name":"Releases","color":"#10b981"},{"name":"Research","color":"#8b5cf6"}]}', 1);
