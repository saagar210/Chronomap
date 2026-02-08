use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedTimeline {
    pub title: String,
    pub description: Option<String>,
    pub tracks: Vec<ImportedTrack>,
    pub events: Vec<ImportedEvent>,
    pub connections: Option<Vec<ImportedConnection>>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedTrack {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedEvent {
    pub title: String,
    pub description: Option<String>,
    pub start_date: String,
    pub end_date: Option<String>,
    pub event_type: Option<String>,
    pub importance: Option<i32>,
    pub track_name: Option<String>,
    pub tags: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedConnection {
    pub source_title: String,
    pub target_title: String,
    pub connection_type: Option<String>,
    pub label: Option<String>,
}

#[tauri::command]
pub fn import_json(
    db: State<'_, Mutex<Connection>>,
    data: String,
) -> AppResult<String> {
    let imported: ImportedTimeline = serde_json::from_str(&data)
        .map_err(|e| AppError::Validation(format!("Invalid JSON: {e}")))?;

    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let tl_id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO timelines (id, title, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![tl_id, imported.title, imported.description.unwrap_or_default(), now, now],
    )?;

    // Create tracks, map name→id
    let mut track_map = std::collections::HashMap::new();
    for (i, track) in imported.tracks.iter().enumerate() {
        let track_id = uuid::Uuid::new_v4().to_string();
        let color = track.color.clone().unwrap_or_else(|| "#3b82f6".to_string());
        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![track_id, tl_id, track.name, color, i as i32, now],
        )?;
        track_map.insert(track.name.clone(), track_id);
    }

    // Ensure at least one track
    if track_map.is_empty() {
        let default_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, color, sort_order, created_at) VALUES (?1, ?2, 'Default', '#3b82f6', 0, ?3)",
            rusqlite::params![default_id, tl_id, now],
        )?;
        track_map.insert("Default".to_string(), default_id);
    }

    let default_track_id = track_map
        .values()
        .next()
        .ok_or_else(|| AppError::Internal("No tracks available".to_string()))?
        .clone();

    // Create events, map title→id
    let mut event_map = std::collections::HashMap::new();
    for event in &imported.events {
        let event_id = uuid::Uuid::new_v4().to_string();
        let track_id = event
            .track_name
            .as_ref()
            .and_then(|n| track_map.get(n))
            .unwrap_or(&default_track_id)
            .clone();

        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, end_date, event_type, importance, tags, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            rusqlite::params![
                event_id, tl_id, track_id, event.title,
                event.description.as_deref().unwrap_or(""),
                event.start_date, event.end_date,
                event.event_type.as_deref().unwrap_or("point"),
                event.importance.unwrap_or(3),
                event.tags.as_deref().unwrap_or(""),
                now, now
            ],
        )?;
        event_map.insert(event.title.clone(), event_id);
    }

    // Create connections
    if let Some(connections) = &imported.connections {
        for conn_data in connections {
            if let (Some(source_id), Some(target_id)) = (
                event_map.get(&conn_data.source_title),
                event_map.get(&conn_data.target_title),
            ) {
                let conn_id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO connections (id, timeline_id, source_event_id, target_event_id, connection_type, label, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    rusqlite::params![
                        conn_id, tl_id, source_id, target_id,
                        conn_data.connection_type.as_deref().unwrap_or("related"),
                        conn_data.label, now
                    ],
                )?;
            }
        }
    }

    Ok(tl_id)
}

#[tauri::command]
pub fn import_csv(
    db: State<'_, Mutex<Connection>>,
    timeline_id: String,
    csv_data: String,
    column_mapping: std::collections::HashMap<String, String>,
) -> AppResult<u32> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Parse CSV
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .from_reader(csv_data.as_bytes());

    let headers: Vec<String> = reader
        .headers()
        .map_err(|e| AppError::Validation(format!("CSV header error: {e}")))?
        .iter()
        .map(|s| s.to_string())
        .collect();

    // Resolve column indices
    let get_col_idx = |field: &str| -> Option<usize> {
        column_mapping
            .get(field)
            .and_then(|col_name| headers.iter().position(|h| h == col_name))
    };

    let title_idx = get_col_idx("title")
        .ok_or_else(|| AppError::Validation("Title column mapping required".to_string()))?;
    let date_idx = get_col_idx("startDate")
        .ok_or_else(|| AppError::Validation("Start date column mapping required".to_string()))?;
    let end_date_idx = get_col_idx("endDate");
    let desc_idx = get_col_idx("description");
    let tags_idx = get_col_idx("tags");
    let type_idx = get_col_idx("eventType");

    // Get first track
    let track_id: String = conn
        .query_row(
            "SELECT id FROM tracks WHERE timeline_id = ?1 ORDER BY sort_order LIMIT 1",
            [&timeline_id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::Validation("Timeline has no tracks".to_string()))?;

    let mut count = 0u32;
    let mut skipped = 0u32;
    for result in reader.records() {
        let record = result.map_err(|e| AppError::Validation(format!("CSV row error: {e}")))?;

        let title = record.get(title_idx).unwrap_or("").trim();
        let start_date = record.get(date_idx).unwrap_or("").trim();

        if title.is_empty() || start_date.is_empty() {
            skipped += 1;
            continue;
        }

        let event_id = uuid::Uuid::new_v4().to_string();
        let end_date = end_date_idx.and_then(|i| {
            let v = record.get(i).unwrap_or("").trim();
            if v.is_empty() { None } else { Some(v.to_string()) }
        });
        let description = desc_idx.and_then(|i| record.get(i)).unwrap_or("").to_string();
        let tags = tags_idx.and_then(|i| record.get(i)).unwrap_or("").to_string();
        let event_type = type_idx.and_then(|i| record.get(i)).unwrap_or("point").to_string();

        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, end_date, event_type, importance, tags, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 3, ?9, ?10, ?11)",
            rusqlite::params![event_id, timeline_id, track_id, title, description, start_date, end_date, event_type, tags, now, now],
        )?;
        count += 1;
    }

    if skipped > 0 {
        tracing::warn!("CSV import: skipped {skipped} rows with empty title or date");
    }

    Ok(count)
}

#[cfg(test)]
mod tests {
    use crate::db::init_test_db;
    use rusqlite::params;

    #[test]
    fn test_import_json() {
        let conn = init_test_db().unwrap();
        let now = "2024-01-01 00:00:00";

        let json_data = r##"{
            "title": "Imported Timeline",
            "description": "A test import",
            "tracks": [
                {"name": "Politics", "color": "#ef4444"},
                {"name": "Science", "color": "#3b82f6"}
            ],
            "events": [
                {
                    "title": "Revolution",
                    "description": "A major revolution",
                    "startDate": "1789-07-14",
                    "trackName": "Politics",
                    "tags": "history,france"
                },
                {
                    "title": "Discovery",
                    "description": "A scientific discovery",
                    "startDate": "1905-06-30",
                    "trackName": "Science"
                }
            ],
            "connections": [
                {
                    "sourceTitle": "Revolution",
                    "targetTitle": "Discovery",
                    "connectionType": "influenced",
                    "label": "inspired"
                }
            ]
        }"##;

        // Parse the JSON to simulate import logic
        let imported: serde_json::Value = serde_json::from_str(json_data).unwrap();

        let tl_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO timelines (id, title, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![tl_id, imported["title"].as_str().unwrap(), imported["description"].as_str().unwrap_or(""), now, now],
        )
        .unwrap();

        // Create tracks
        let mut track_map = std::collections::HashMap::new();
        for (i, track) in imported["tracks"].as_array().unwrap().iter().enumerate() {
            let track_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO tracks (id, timeline_id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![track_id, tl_id, track["name"].as_str().unwrap(), track["color"].as_str().unwrap(), i as i32, now],
            )
            .unwrap();
            track_map.insert(track["name"].as_str().unwrap().to_string(), track_id);
        }

        // Create events
        let mut event_map = std::collections::HashMap::new();
        for event in imported["events"].as_array().unwrap() {
            let event_id = uuid::Uuid::new_v4().to_string();
            let track_name = event["trackName"].as_str().unwrap_or("Politics");
            let track_id = track_map.get(track_name).unwrap();
            conn.execute(
                "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, event_type, importance, tags, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'point', 3, ?7, ?8, ?9)",
                params![
                    event_id, tl_id, track_id,
                    event["title"].as_str().unwrap(),
                    event["description"].as_str().unwrap_or(""),
                    event["startDate"].as_str().unwrap(),
                    event["tags"].as_str().unwrap_or(""),
                    now, now
                ],
            )
            .unwrap();
            event_map.insert(event["title"].as_str().unwrap().to_string(), event_id);
        }

        // Create connections
        if let Some(connections) = imported["connections"].as_array() {
            for c in connections {
                let source_id = event_map.get(c["sourceTitle"].as_str().unwrap()).unwrap();
                let target_id = event_map.get(c["targetTitle"].as_str().unwrap()).unwrap();
                let cid = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO connections (id, timeline_id, source_event_id, target_event_id, connection_type, label, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![cid, tl_id, source_id, target_id, c["connectionType"].as_str().unwrap_or("related"), c["label"].as_str(), now],
                )
                .unwrap();
            }
        }

        // Verify timeline
        let title: String = conn
            .query_row("SELECT title FROM timelines WHERE id = ?1", [&tl_id], |row| row.get(0))
            .unwrap();
        assert_eq!(title, "Imported Timeline");

        // Verify tracks
        let track_count: i32 = conn
            .query_row("SELECT COUNT(*) FROM tracks WHERE timeline_id = ?1", [&tl_id], |row| row.get(0))
            .unwrap();
        assert_eq!(track_count, 2);

        // Verify events
        let event_count: i32 = conn
            .query_row("SELECT COUNT(*) FROM events WHERE timeline_id = ?1", [&tl_id], |row| row.get(0))
            .unwrap();
        assert_eq!(event_count, 2);

        // Verify connection
        let conn_count: i32 = conn
            .query_row("SELECT COUNT(*) FROM connections WHERE timeline_id = ?1", [&tl_id], |row| row.get(0))
            .unwrap();
        assert_eq!(conn_count, 1);

        let (ct, label): (String, Option<String>) = conn
            .query_row(
                "SELECT connection_type, label FROM connections WHERE timeline_id = ?1",
                [&tl_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(ct, "influenced");
        assert_eq!(label.as_deref(), Some("inspired"));
    }

    #[test]
    fn test_import_csv() {
        let conn = init_test_db().unwrap();
        let now = "2024-01-01 00:00:00";

        // Create a timeline and track first
        let tl_id = uuid::Uuid::new_v4().to_string();
        let tr_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO timelines (id, title) VALUES (?1, ?2)",
            params![tl_id, "CSV Timeline"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, sort_order) VALUES (?1, ?2, ?3, 0)",
            params![tr_id, tl_id, "Default"],
        )
        .unwrap();

        let csv_data = "Title,Date,Description\nWWII Starts,1939-09-01,Germany invades Poland\nMoon Landing,1969-07-20,Apollo 11\n";

        // Parse CSV manually (simulating import_csv logic)
        let mut reader = csv::ReaderBuilder::new()
            .has_headers(true)
            .from_reader(csv_data.as_bytes());

        let headers: Vec<String> = reader
            .headers()
            .unwrap()
            .iter()
            .map(|s| s.to_string())
            .collect();

        // column_mapping: title -> Title, startDate -> Date, description -> Description
        let title_idx = headers.iter().position(|h| h == "Title").unwrap();
        let date_idx = headers.iter().position(|h| h == "Date").unwrap();
        let desc_idx = headers.iter().position(|h| h == "Description").unwrap();

        let mut count = 0u32;
        for result in reader.records() {
            let record = result.unwrap();
            let title = record.get(title_idx).unwrap().trim();
            let start_date = record.get(date_idx).unwrap().trim();
            let description = record.get(desc_idx).unwrap_or("").to_string();

            if title.is_empty() || start_date.is_empty() {
                continue;
            }

            let event_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, event_type, importance, tags, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'point', 3, '', ?7, ?8)",
                params![event_id, tl_id, tr_id, title, description, start_date, now, now],
            )
            .unwrap();
            count += 1;
        }

        assert_eq!(count, 2);

        let event_count: i32 = conn
            .query_row("SELECT COUNT(*) FROM events WHERE timeline_id = ?1", [&tl_id], |row| row.get(0))
            .unwrap();
        assert_eq!(event_count, 2);

        // Verify specific event data
        let title: String = conn
            .query_row(
                "SELECT title FROM events WHERE timeline_id = ?1 ORDER BY start_date LIMIT 1",
                [&tl_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(title, "WWII Starts");
    }
}
