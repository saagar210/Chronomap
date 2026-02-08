use std::sync::Mutex;

use rusqlite::Connection;
use serde::Serialize;
use tauri::State;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedTimeline {
    pub version: u32,
    pub title: String,
    pub description: String,
    pub tracks: Vec<ExportedTrack>,
    pub events: Vec<ExportedEvent>,
    pub connections: Vec<ExportedConnection>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedTrack {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedEvent {
    pub title: String,
    pub description: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub event_type: String,
    pub importance: i32,
    pub track_name: String,
    pub color: Option<String>,
    pub tags: String,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedConnection {
    pub source_title: String,
    pub target_title: String,
    pub connection_type: String,
    pub label: Option<String>,
}

#[tauri::command]
pub fn export_json(
    db: State<'_, Mutex<Connection>>,
    timeline_id: String,
) -> AppResult<String> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    let (title, description): (String, String) = conn.query_row(
        "SELECT title, description FROM timelines WHERE id = ?1",
        [&timeline_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|_| AppError::NotFound(format!("Timeline {timeline_id} not found")))?;

    let mut track_stmt = conn.prepare(
        "SELECT id, name, color FROM tracks WHERE timeline_id = ?1 ORDER BY sort_order",
    )?;
    let tracks_raw: Vec<(String, String, String)> = track_stmt
        .query_map([&timeline_id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let track_name_map: std::collections::HashMap<String, String> = tracks_raw
        .iter()
        .map(|(id, name, _)| (id.clone(), name.clone()))
        .collect();

    let tracks: Vec<ExportedTrack> = tracks_raw
        .iter()
        .map(|(_, name, color)| ExportedTrack { name: name.clone(), color: color.clone() })
        .collect();

    struct EventRow {
        id: String,
        title: String,
        description: String,
        start_date: String,
        end_date: Option<String>,
        event_type: String,
        importance: i32,
        track_id: String,
        color: Option<String>,
        tags: String,
        source: Option<String>,
    }

    let mut event_stmt = conn.prepare(
        "SELECT id, title, description, start_date, end_date, event_type, importance, track_id, color, tags, source FROM events WHERE timeline_id = ?1 ORDER BY start_date",
    )?;
    let events_raw: Vec<EventRow> = event_stmt
        .query_map([&timeline_id], |row| {
            Ok(EventRow {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                start_date: row.get(3)?,
                end_date: row.get(4)?,
                event_type: row.get(5)?,
                importance: row.get(6)?,
                track_id: row.get(7)?,
                color: row.get(8)?,
                tags: row.get(9)?,
                source: row.get(10)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let event_title_map: std::collections::HashMap<String, String> = events_raw
        .iter()
        .map(|e| (e.id.clone(), e.title.clone()))
        .collect();

    let events: Vec<ExportedEvent> = events_raw
        .iter()
        .map(|e| ExportedEvent {
            title: e.title.clone(),
            description: e.description.clone(),
            start_date: e.start_date.clone(),
            end_date: e.end_date.clone(),
            event_type: e.event_type.clone(),
            importance: e.importance,
            track_name: track_name_map.get(&e.track_id).cloned().unwrap_or_default(),
            color: e.color.clone(),
            tags: e.tags.clone(),
            source: e.source.clone(),
        })
        .collect();

    let mut conn_stmt = conn.prepare(
        "SELECT source_event_id, target_event_id, connection_type, label FROM connections WHERE timeline_id = ?1",
    )?;
    let connections: Vec<ExportedConnection> = conn_stmt
        .query_map([&timeline_id], |row| {
            let source_id: String = row.get(0)?;
            let target_id: String = row.get(1)?;
            Ok((source_id, target_id, row.get::<_, String>(2)?, row.get::<_, Option<String>>(3)?))
        })?
        .filter_map(|r| r.ok())
        .filter_map(|(source_id, target_id, conn_type, label)| {
            let source_title = event_title_map.get(&source_id)?.clone();
            let target_title = event_title_map.get(&target_id)?.clone();
            Some(ExportedConnection { source_title, target_title, connection_type: conn_type, label })
        })
        .collect();

    let exported = ExportedTimeline {
        version: 1,
        title,
        description,
        tracks,
        events,
        connections,
    };

    serde_json::to_string_pretty(&exported)
        .map_err(|e| AppError::Internal(format!("JSON serialization error: {e}")))
}

#[tauri::command]
pub fn export_csv(
    db: State<'_, Mutex<Connection>>,
    timeline_id: String,
) -> AppResult<String> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    let track_names: std::collections::HashMap<String, String> = {
        let mut stmt = conn.prepare("SELECT id, name FROM tracks WHERE timeline_id = ?1")?;
        let results: Vec<(String, String)> = stmt.query_map([&timeline_id], |row| Ok((row.get(0)?, row.get(1)?)))?
            .filter_map(|r| r.ok())
            .collect();
        results.into_iter().collect()
    };

    let mut stmt = conn.prepare(
        "SELECT title, start_date, end_date, event_type, importance, track_id, description, tags FROM events WHERE timeline_id = ?1 ORDER BY start_date",
    )?;

    let mut csv_out = String::from("title,start_date,end_date,event_type,importance,track,description,tags\n");

    let rows = stmt.query_map([&timeline_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, i32>(4)?,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
            row.get::<_, String>(7)?,
        ))
    })?;

    for row in rows {
        let (title, start, end, etype, imp, track_id, desc, tags) = row?;
        let track_name = track_names.get(&track_id).cloned().unwrap_or_default();
        let escape = |s: &str| {
            // Prevent CSV injection: prefix formula-starting chars
            let safe = if s.starts_with('=') || s.starts_with('+') || s.starts_with('-') || s.starts_with('@') {
                format!("'{s}")
            } else {
                s.to_string()
            };
            if safe.contains(',') || safe.contains('"') || safe.contains('\n') {
                format!("\"{}\"", safe.replace('"', "\"\""))
            } else {
                safe
            }
        };
        csv_out.push_str(&format!(
            "{},{},{},{},{},{},{},{}\n",
            escape(&title), escape(&start), escape(&end.unwrap_or_default()),
            escape(&etype), imp, escape(&track_name), escape(&desc), escape(&tags)
        ));
    }

    Ok(csv_out)
}

#[tauri::command]
pub fn export_markdown(
    db: State<'_, Mutex<Connection>>,
    timeline_id: String,
) -> AppResult<String> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    let title: String = conn.query_row(
        "SELECT title FROM timelines WHERE id = ?1",
        [&timeline_id],
        |row| row.get(0),
    ).map_err(|_| AppError::NotFound("Timeline not found".to_string()))?;

    let mut stmt = conn.prepare(
        "SELECT title, start_date, end_date, description, event_type FROM events WHERE timeline_id = ?1 ORDER BY start_date",
    )?;

    let mut md = format!("# {title}\n\n");
    let mut current_year = String::new();

    let rows = stmt.query_map([&timeline_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
        ))
    })?;

    for row in rows {
        let (ev_title, start, end, desc, _etype) = row?;
        let year = start.get(..4).unwrap_or("").to_string();
        if year != current_year {
            current_year = year.clone();
            md.push_str(&format!("\n## {year}\n\n"));
        }

        md.push_str(&format!("### {ev_title}\n\n"));
        md.push_str(&format!("**Date:** {start}"));
        if let Some(ref e) = end {
            md.push_str(&format!(" — {e}"));
        }
        md.push_str("\n\n");

        if !desc.is_empty() {
            md.push_str(&desc);
            md.push_str("\n\n");
        }
    }

    Ok(md)
}

fn validate_file_path(path: &str) -> AppResult<()> {
    let p = std::path::Path::new(path);

    // Block obviously dangerous paths
    if path.contains("..") {
        return Err(AppError::Validation("Path traversal not allowed".to_string()));
    }

    // Must be an absolute path (from a file dialog)
    if !p.is_absolute() {
        return Err(AppError::Validation("Absolute path required".to_string()));
    }

    Ok(())
}

#[tauri::command]
pub fn save_file(path: String, content: String) -> AppResult<()> {
    validate_file_path(&path)?;
    std::fs::write(&path, &content)
        .map_err(|e| AppError::Internal(format!("Failed to write file: {e}")))
}

#[tauri::command]
pub fn read_file(path: String) -> AppResult<String> {
    validate_file_path(&path)?;
    std::fs::read_to_string(&path)
        .map_err(|e| AppError::Internal(format!("Failed to read file: {e}")))
}

#[tauri::command]
pub async fn show_save_dialog(
    default_path: String,
    filter_name: String,
    filter_extensions: Vec<String>,
) -> AppResult<Option<String>> {
    let extensions: Vec<&str> = filter_extensions.iter().map(|s| s.as_str()).collect();
    let dialog = rfd::AsyncFileDialog::new()
        .set_file_name(&default_path)
        .add_filter(&filter_name, &extensions)
        .save_file()
        .await;
    Ok(dialog.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn show_open_dialog(
    filter_name: String,
    filter_extensions: Vec<String>,
) -> AppResult<Option<String>> {
    let extensions: Vec<&str> = filter_extensions.iter().map(|s| s.as_str()).collect();
    let dialog = rfd::AsyncFileDialog::new()
        .add_filter(&filter_name, &extensions)
        .pick_file()
        .await;
    Ok(dialog.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub fn export_svg(
    db: State<'_, Mutex<Connection>>,
    timeline_id: String,
) -> AppResult<String> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    crate::export::svg::generate_svg(&conn, &timeline_id)
}

#[tauri::command]
pub fn export_pdf(
    db: State<'_, Mutex<Connection>>,
    timeline_id: String,
) -> AppResult<Vec<u8>> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    crate::export::pdf::generate_pdf(&conn, &timeline_id)
}

#[cfg(test)]
mod tests {
    use crate::db::init_test_db;
    use rusqlite::params;

    fn setup_export_data(conn: &rusqlite::Connection) -> String {
        let tl_id = uuid::Uuid::new_v4().to_string();
        let tr1_id = uuid::Uuid::new_v4().to_string();
        let tr2_id = uuid::Uuid::new_v4().to_string();
        let ev1_id = uuid::Uuid::new_v4().to_string();
        let ev2_id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO timelines (id, title, description) VALUES (?1, ?2, ?3)",
            params![tl_id, "Export Test", "A timeline for export"],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, color, sort_order) VALUES (?1, ?2, ?3, ?4, 0)",
            params![tr1_id, tl_id, "Politics", "#ef4444"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, color, sort_order) VALUES (?1, ?2, ?3, ?4, 1)",
            params![tr2_id, tl_id, "Science", "#3b82f6"],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, event_type, importance, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'point', 5, 'war,history')",
            params![ev1_id, tl_id, tr1_id, "Revolution", "The great revolution", "1789-07-14"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, end_date, event_type, importance, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'range', 3, 'science')",
            params![ev2_id, tl_id, tr2_id, "Relativity", "Theory of relativity", "1905-06-30", "1905-09-26"],
        )
        .unwrap();

        // Add a connection
        let cid = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO connections (id, timeline_id, source_event_id, target_event_id, connection_type, label)
             VALUES (?1, ?2, ?3, ?4, 'influenced', 'inspired')",
            params![cid, tl_id, ev1_id, ev2_id],
        )
        .unwrap();

        tl_id
    }

    #[test]
    fn test_export_json_structure() {
        let conn = init_test_db().unwrap();
        let tl_id = setup_export_data(&conn);

        let (title, description): (String, String) = conn
            .query_row(
                "SELECT title, description FROM timelines WHERE id = ?1",
                [&tl_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(title, "Export Test");
        assert_eq!(description, "A timeline for export");

        // Verify tracks
        let mut track_stmt = conn
            .prepare("SELECT id, name, color FROM tracks WHERE timeline_id = ?1 ORDER BY sort_order")
            .unwrap();
        let tracks: Vec<(String, String, String)> = track_stmt
            .query_map([&tl_id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        assert_eq!(tracks.len(), 2);
        assert_eq!(tracks[0].1, "Politics");
        assert_eq!(tracks[1].1, "Science");

        // Verify events
        let event_count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM events WHERE timeline_id = ?1",
                [&tl_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(event_count, 2);

        // Verify connections
        let conn_count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM connections WHERE timeline_id = ?1",
                [&tl_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(conn_count, 1);
    }

    #[test]
    fn test_export_json_event_track_resolution() {
        let conn = init_test_db().unwrap();
        let tl_id = setup_export_data(&conn);

        let track_name_map: std::collections::HashMap<String, String> = {
            let mut stmt = conn
                .prepare("SELECT id, name FROM tracks WHERE timeline_id = ?1")
                .unwrap();
            stmt.query_map([&tl_id], |row| Ok((row.get(0)?, row.get(1)?)))
                .unwrap()
                .filter_map(|r| r.ok())
                .collect()
        };

        let mut stmt = conn
            .prepare("SELECT title, track_id FROM events WHERE timeline_id = ?1 ORDER BY start_date")
            .unwrap();
        let events: Vec<(String, String)> = stmt
            .query_map([&tl_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        let rev_track = track_name_map.get(&events[0].1).unwrap();
        assert_eq!(rev_track, "Politics");

        let rel_track = track_name_map.get(&events[1].1).unwrap();
        assert_eq!(rel_track, "Science");
    }

    #[test]
    fn test_export_csv_format() {
        let conn = init_test_db().unwrap();
        let tl_id = setup_export_data(&conn);

        let track_names: std::collections::HashMap<String, String> = {
            let mut stmt = conn
                .prepare("SELECT id, name FROM tracks WHERE timeline_id = ?1")
                .unwrap();
            stmt.query_map([&tl_id], |row| Ok((row.get(0)?, row.get(1)?)))
                .unwrap()
                .filter_map(|r| r.ok())
                .collect()
        };

        let mut stmt = conn
            .prepare("SELECT title, start_date, end_date, event_type, importance, track_id, description, tags FROM events WHERE timeline_id = ?1 ORDER BY start_date")
            .unwrap();

        let mut csv_out = String::from("title,start_date,end_date,event_type,importance,track,description,tags\n");

        let rows = stmt
            .query_map([&tl_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, i32>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, String>(7)?,
                ))
            })
            .unwrap();

        for row in rows {
            let (title, start, end, etype, imp, track_id, desc, tags) = row.unwrap();
            let track_name = track_names.get(&track_id).cloned().unwrap_or_default();
            csv_out.push_str(&format!(
                "{},{},{},{},{},{},{},{}\n",
                title, start, end.unwrap_or_default(), etype, imp, track_name, desc, tags
            ));
        }

        // Verify CSV header
        assert!(csv_out.starts_with("title,start_date,end_date,event_type,importance,track,description,tags"));
        // Verify data rows
        assert!(csv_out.contains("Revolution"));
        assert!(csv_out.contains("Relativity"));
        assert!(csv_out.contains("1789-07-14"));
        assert!(csv_out.contains("1905-06-30"));
        assert!(csv_out.contains("Politics"));
        assert!(csv_out.contains("Science"));
    }

    #[test]
    fn test_export_markdown_structure() {
        let conn = init_test_db().unwrap();
        let tl_id = setup_export_data(&conn);

        let title: String = conn
            .query_row("SELECT title FROM timelines WHERE id = ?1", [&tl_id], |row| row.get(0))
            .unwrap();

        let mut stmt = conn
            .prepare("SELECT title, start_date, end_date, description, event_type FROM events WHERE timeline_id = ?1 ORDER BY start_date")
            .unwrap();

        let mut md = format!("# {title}\n\n");
        let mut current_year = String::new();

        let rows = stmt
            .query_map([&tl_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                ))
            })
            .unwrap();

        for row in rows {
            let (ev_title, start, end, desc, _etype) = row.unwrap();
            let year = start.get(..4).unwrap_or("").to_string();
            if year != current_year {
                current_year = year.clone();
                md.push_str(&format!("\n## {year}\n\n"));
            }
            md.push_str(&format!("### {ev_title}\n\n"));
            md.push_str(&format!("**Date:** {start}"));
            if let Some(ref e) = end {
                md.push_str(&format!(" — {e}"));
            }
            md.push_str("\n\n");
            if !desc.is_empty() {
                md.push_str(&desc);
                md.push_str("\n\n");
            }
        }

        assert!(md.starts_with("# Export Test"));
        assert!(md.contains("## 1789"));
        assert!(md.contains("## 1905"));
        assert!(md.contains("### Revolution"));
        assert!(md.contains("### Relativity"));
        assert!(md.contains("**Date:** 1789-07-14"));
        assert!(md.contains("**Date:** 1905-06-30 — 1905-09-26"));
        assert!(md.contains("The great revolution"));
        assert!(md.contains("Theory of relativity"));
    }
}
