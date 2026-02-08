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

#[cfg(test)]
mod tests {
    use crate::db::init_test_db;
    use rusqlite::params;

    #[test]
    fn test_get_default_settings() {
        let conn = init_test_db().unwrap();

        // Migration seeds: theme=system, ai_model=llama3.2, ai_host=http://localhost:11434
        let theme: String = conn
            .query_row("SELECT value FROM settings WHERE key = 'theme'", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(theme, "system");

        let model: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'ai_model'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(model, "llama3.2");

        let host: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'ai_host'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(host, "http://localhost:11434");
    }

    #[test]
    fn test_update_setting() {
        let conn = init_test_db().unwrap();

        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            params!["theme", "dark"],
        )
        .unwrap();

        let value: String = conn
            .query_row("SELECT value FROM settings WHERE key = 'theme'", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(value, "dark");
    }

    #[test]
    fn test_insert_new_setting() {
        let conn = init_test_db().unwrap();

        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            params!["custom_key", "custom_value"],
        )
        .unwrap();

        let value: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'custom_key'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(value, "custom_value");
    }

    #[test]
    fn test_get_nonexistent_setting() {
        let conn = init_test_db().unwrap();

        let result = conn.query_row(
            "SELECT value FROM settings WHERE key = 'nonexistent'",
            [],
            |row| row.get::<_, String>(0),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_update_setting_twice() {
        let conn = init_test_db().unwrap();

        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            params!["theme", "dark"],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
            params!["theme", "light"],
        )
        .unwrap();

        let value: String = conn
            .query_row("SELECT value FROM settings WHERE key = 'theme'", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(value, "light");
    }
}
