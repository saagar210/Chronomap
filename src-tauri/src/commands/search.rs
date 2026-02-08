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

#[cfg(test)]
mod tests {
    use crate::db::init_test_db;
    use rusqlite::params;

    fn setup_with_events(conn: &rusqlite::Connection) -> String {
        let tl_id = uuid::Uuid::new_v4().to_string();
        let tr_id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO timelines (id, title) VALUES (?1, ?2)",
            params![tl_id, "Test"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name) VALUES (?1, ?2, ?3)",
            params![tr_id, tl_id, "Track 1"],
        )
        .unwrap();

        let events = vec![
            ("World War II begins", "Germany invades Poland", "1939-09-01"),
            ("Moon Landing", "Apollo 11 astronauts land on the moon", "1969-07-20"),
            ("Berlin Wall falls", "The wall dividing Berlin is torn down", "1989-11-09"),
        ];

        for (title, desc, date) in events {
            let eid = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO events (id, timeline_id, track_id, title, description, start_date) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![eid, tl_id, tr_id, title, desc, date],
            )
            .unwrap();
        }

        tl_id
    }

    #[test]
    fn test_fts_search_by_title() {
        let conn = init_test_db().unwrap();
        let tl_id = setup_with_events(&conn);

        // FTS search for "Moon"
        let has_fts: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='events_fts')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(has_fts, "FTS table should exist");

        let mut stmt = conn
            .prepare(
                "SELECT e.id, e.title
                 FROM events_fts fts
                 JOIN events e ON e.rowid = fts.rowid
                 WHERE events_fts MATCH ?1 AND e.timeline_id = ?2
                 ORDER BY rank LIMIT 50",
            )
            .unwrap();

        let results: Vec<String> = stmt
            .query_map(params!["Moon*", tl_id], |row| row.get(1))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0], "Moon Landing");
    }

    #[test]
    fn test_fts_search_by_description() {
        let conn = init_test_db().unwrap();
        let tl_id = setup_with_events(&conn);

        let mut stmt = conn
            .prepare(
                "SELECT e.title
                 FROM events_fts fts
                 JOIN events e ON e.rowid = fts.rowid
                 WHERE events_fts MATCH ?1 AND e.timeline_id = ?2",
            )
            .unwrap();

        let results: Vec<String> = stmt
            .query_map(params!["Poland*", tl_id], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0], "World War II begins");
    }

    #[test]
    fn test_search_no_matches() {
        let conn = init_test_db().unwrap();
        let tl_id = setup_with_events(&conn);

        let mut stmt = conn
            .prepare(
                "SELECT e.title
                 FROM events_fts fts
                 JOIN events e ON e.rowid = fts.rowid
                 WHERE events_fts MATCH ?1 AND e.timeline_id = ?2",
            )
            .unwrap();

        let results: Vec<String> = stmt
            .query_map(params!["xyznonexistent*", tl_id], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_search_empty_query_fallback() {
        let conn = init_test_db().unwrap();
        let tl_id = setup_with_events(&conn);

        // Empty query falls back to LIKE search with "%%" which matches everything
        let like = "%%";
        let mut stmt = conn
            .prepare(
                "SELECT id, title FROM events WHERE timeline_id = ?1 AND (title LIKE ?2 OR description LIKE ?2) ORDER BY start_date LIMIT 50",
            )
            .unwrap();

        let results: Vec<String> = stmt
            .query_map(params![tl_id, like], |row| row.get(1))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(results.len(), 3);
    }

    #[test]
    fn test_like_search_fallback() {
        let conn = init_test_db().unwrap();
        let tl_id = setup_with_events(&conn);

        let like = "%Berlin%";
        let mut stmt = conn
            .prepare(
                "SELECT title FROM events WHERE timeline_id = ?1 AND (title LIKE ?2 OR description LIKE ?2) ORDER BY start_date LIMIT 50",
            )
            .unwrap();

        let results: Vec<String> = stmt
            .query_map(params![tl_id, like], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0], "Berlin Wall falls");
    }
}
