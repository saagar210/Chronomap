use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::db::models::{CreateTrack, Track, UpdateTrack};
use crate::error::{AppError, AppResult};

#[tauri::command]
pub fn create_track(db: State<'_, Mutex<Connection>>, input: CreateTrack) -> AppResult<Track> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let color = input.color.unwrap_or_else(|| "#3b82f6".to_string());

    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM tracks WHERE timeline_id = ?1",
            [&input.timeline_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO tracks (id, timeline_id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, input.timeline_id, input.name, color, max_order + 1, now],
    )?;

    Ok(Track {
        id,
        timeline_id: input.timeline_id,
        name: input.name,
        color,
        sort_order: max_order + 1,
        visible: true,
        created_at: now,
    })
}

#[tauri::command]
pub fn list_tracks(
    db: State<'_, Mutex<Connection>>,
    timeline_id: String,
) -> AppResult<Vec<Track>> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let mut stmt = conn.prepare(
        "SELECT id, timeline_id, name, color, sort_order, visible, created_at FROM tracks WHERE timeline_id = ?1 ORDER BY sort_order",
    )?;

    let tracks = stmt
        .query_map([&timeline_id], |row| {
            Ok(Track {
                id: row.get(0)?,
                timeline_id: row.get(1)?,
                name: row.get(2)?,
                color: row.get(3)?,
                sort_order: row.get(4)?,
                visible: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(tracks)
}

#[tauri::command]
pub fn update_track(db: State<'_, Mutex<Connection>>, input: UpdateTrack) -> AppResult<Track> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    if let Some(ref name) = input.name {
        conn.execute(
            "UPDATE tracks SET name = ?1 WHERE id = ?2",
            rusqlite::params![name, input.id],
        )?;
    }
    if let Some(ref color) = input.color {
        conn.execute(
            "UPDATE tracks SET color = ?1 WHERE id = ?2",
            rusqlite::params![color, input.id],
        )?;
    }
    if let Some(visible) = input.visible {
        conn.execute(
            "UPDATE tracks SET visible = ?1 WHERE id = ?2",
            rusqlite::params![visible, input.id],
        )?;
    }

    conn.query_row(
        "SELECT id, timeline_id, name, color, sort_order, visible, created_at FROM tracks WHERE id = ?1",
        [&input.id],
        |row| {
            Ok(Track {
                id: row.get(0)?,
                timeline_id: row.get(1)?,
                name: row.get(2)?,
                color: row.get(3)?,
                sort_order: row.get(4)?,
                visible: row.get(5)?,
                created_at: row.get(6)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("Track {} not found", input.id))
        }
        other => AppError::Database(other),
    })
}

#[tauri::command]
pub fn delete_track(db: State<'_, Mutex<Connection>>, id: String) -> AppResult<()> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let changes = conn.execute("DELETE FROM tracks WHERE id = ?1", [&id])?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("Track {id} not found")));
    }
    Ok(())
}

#[tauri::command]
pub fn reorder_tracks(
    db: State<'_, Mutex<Connection>>,
    track_ids: Vec<String>,
) -> AppResult<()> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    for (i, id) in track_ids.iter().enumerate() {
        conn.execute(
            "UPDATE tracks SET sort_order = ?1 WHERE id = ?2",
            rusqlite::params![i as i32, id],
        )?;
    }

    Ok(())
}
