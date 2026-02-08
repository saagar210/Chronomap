use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::db::models::Template;
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct TemplateData {
    tracks: Vec<TemplateTrack>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct TemplateTrack {
    name: String,
    color: String,
}

#[tauri::command]
pub fn list_templates(db: State<'_, Mutex<Connection>>) -> AppResult<Vec<Template>> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let mut stmt = conn.prepare(
        "SELECT id, name, description, data, is_builtin, created_at FROM templates ORDER BY is_builtin DESC, name",
    )?;
    let templates = stmt
        .query_map([], |row| {
            Ok(Template {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                data: row.get(3)?,
                is_builtin: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(templates)
}

#[tauri::command]
pub fn create_from_template(
    db: State<'_, Mutex<Connection>>,
    template_id: String,
    title: String,
) -> AppResult<String> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let data_str: String = conn
        .query_row(
            "SELECT data FROM templates WHERE id = ?1",
            [&template_id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::NotFound(format!("Template {template_id} not found")))?;

    let template_data: TemplateData = serde_json::from_str(&data_str)
        .map_err(|e| AppError::Internal(format!("Invalid template data: {e}")))?;

    let tl_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO timelines (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![tl_id, title, now, now],
    )?;

    for (i, track) in template_data.tracks.iter().enumerate() {
        let track_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![track_id, tl_id, track.name, track.color, i as i32, now],
        )?;
    }

    Ok(tl_id)
}

#[tauri::command]
pub fn save_as_template(
    db: State<'_, Mutex<Connection>>,
    timeline_id: String,
    name: String,
    description: String,
) -> AppResult<Template> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let mut stmt = conn.prepare(
        "SELECT name, color FROM tracks WHERE timeline_id = ?1 ORDER BY sort_order",
    )?;
    let tracks: Vec<TemplateTrack> = stmt
        .query_map([&timeline_id], |row| {
            Ok(TemplateTrack {
                name: row.get(0)?,
                color: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let data = serde_json::to_string(&TemplateData { tracks })
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO templates (id, name, description, data, is_builtin, created_at) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
        rusqlite::params![id, name, description, data, now],
    )?;

    Ok(Template {
        id,
        name,
        description,
        data,
        is_builtin: false,
        created_at: now,
    })
}

#[tauri::command]
pub fn delete_template(db: State<'_, Mutex<Connection>>, id: String) -> AppResult<()> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let is_builtin: bool = conn
        .query_row("SELECT is_builtin FROM templates WHERE id = ?1", [&id], |row| row.get(0))
        .map_err(|_| AppError::NotFound(format!("Template {id} not found")))?;

    if is_builtin {
        return Err(AppError::Validation("Cannot delete built-in templates".to_string()));
    }

    conn.execute("DELETE FROM templates WHERE id = ?1", [&id])?;
    Ok(())
}
