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

    let mut event_stmt = conn.prepare(
        "SELECT id, title, description, start_date, end_date, event_type, importance, track_id, color, tags, source FROM events WHERE timeline_id = ?1 ORDER BY start_date",
    )?;
    #[allow(clippy::type_complexity)]
    let events_raw: Vec<(String, String, String, String, Option<String>, String, i32, String, Option<String>, String, Option<String>)> = event_stmt
        .query_map([&timeline_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?, row.get(6)?, row.get(7)?, row.get(8)?, row.get(9)?, row.get(10)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let event_title_map: std::collections::HashMap<String, String> = events_raw
        .iter()
        .map(|(id, title, ..)| (id.clone(), title.clone()))
        .collect();

    let events: Vec<ExportedEvent> = events_raw
        .iter()
        .map(|(_, title, desc, start, end, etype, imp, track_id, color, tags, source)| ExportedEvent {
            title: title.clone(),
            description: desc.clone(),
            start_date: start.clone(),
            end_date: end.clone(),
            event_type: etype.clone(),
            importance: *imp,
            track_name: track_name_map.get(track_id).cloned().unwrap_or_default(),
            color: color.clone(),
            tags: tags.clone(),
            source: source.clone(),
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
            if s.contains(',') || s.contains('"') || s.contains('\n') {
                format!("\"{}\"", s.replace('"', "\"\""))
            } else {
                s.to_string()
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

#[tauri::command]
pub fn save_file(path: String, content: String) -> AppResult<()> {
    std::fs::write(&path, &content)
        .map_err(|e| AppError::Internal(format!("Failed to write file: {e}")))
}

#[tauri::command]
pub fn read_file(path: String) -> AppResult<String> {
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
