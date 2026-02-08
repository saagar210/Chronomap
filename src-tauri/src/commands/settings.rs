use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::db::models::Setting;
use crate::error::{AppError, AppResult};

#[tauri::command]
pub fn get_setting(db: State<'_, Mutex<Connection>>, key: String) -> AppResult<Setting> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    conn.query_row(
        "SELECT key, value FROM settings WHERE key = ?1",
        [&key],
        |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("Setting '{key}' not found"))
        }
        other => AppError::Database(other),
    })
}

#[tauri::command]
pub fn update_setting(
    db: State<'_, Mutex<Connection>>,
    key: String,
    value: String,
) -> AppResult<Setting> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        rusqlite::params![key, value],
    )?;

    Ok(Setting { key, value })
}
