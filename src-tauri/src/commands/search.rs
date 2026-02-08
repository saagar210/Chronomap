use std::sync::Mutex;

use rusqlite::Connection;
use serde::Serialize;
use tauri::State;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub event_id: String,
    pub title: String,
    pub snippet: String,
    pub start_date: String,
    pub track_id: String,
}

#[tauri::command]
pub fn search_events(
    db: State<'_, Mutex<Connection>>,
    timeline_id: String,
    query: String,
) -> AppResult<Vec<SearchResult>> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    // Check if FTS table exists
    let has_fts: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='events_fts')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if has_fts && !query.trim().is_empty() {
        let fts_query = format!("{}*", query.trim()); // prefix match
        let mut stmt = conn.prepare(
            "SELECT e.id, e.title, snippet(events_fts, 1, '<b>', '</b>', '...', 20), e.start_date, e.track_id
             FROM events_fts fts
             JOIN events e ON e.rowid = fts.rowid
             WHERE events_fts MATCH ?1 AND e.timeline_id = ?2
             ORDER BY rank
             LIMIT 50",
        )?;

        let results = stmt
            .query_map(rusqlite::params![fts_query, timeline_id], |row| {
                Ok(SearchResult {
                    event_id: row.get(0)?,
                    title: row.get(1)?,
                    snippet: row.get(2)?,
                    start_date: row.get(3)?,
                    track_id: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(results)
    } else {
        // Fallback: LIKE search
        let like = format!("%{}%", query.trim());
        let mut stmt = conn.prepare(
            "SELECT id, title, SUBSTR(description, 1, 100), start_date, track_id
             FROM events
             WHERE timeline_id = ?1 AND (title LIKE ?2 OR description LIKE ?2 OR tags LIKE ?2)
             ORDER BY start_date
             LIMIT 50",
        )?;

        let results = stmt
            .query_map(rusqlite::params![timeline_id, like], |row| {
                Ok(SearchResult {
                    event_id: row.get(0)?,
                    title: row.get(1)?,
                    snippet: row.get(2)?,
                    start_date: row.get(3)?,
                    track_id: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(results)
    }
}
