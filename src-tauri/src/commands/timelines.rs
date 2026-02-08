use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::db::models::{CreateTimeline, Timeline, UpdateTimeline};
use crate::error::{AppError, AppResult};

#[tauri::command]
pub fn create_timeline(
    db: State<'_, Mutex<Connection>>,
    input: CreateTimeline,
) -> AppResult<Timeline> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let description = input.description.unwrap_or_default();

    conn.execute(
        "INSERT INTO timelines (id, title, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, input.title, description, now, now],
    )?;

    // Create a default track
    let track_id = uuid::Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO tracks (id, timeline_id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
        rusqlite::params![track_id, id, "Default", "#3b82f6", now],
    )?;

    Ok(Timeline {
        id,
        title: input.title,
        description,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn get_timeline(db: State<'_, Mutex<Connection>>, id: String) -> AppResult<Timeline> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    conn.query_row(
        "SELECT id, title, description, created_at, updated_at FROM timelines WHERE id = ?1",
        [&id],
        |row| {
            Ok(Timeline {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("Timeline {id} not found"))
        }
        other => AppError::Database(other),
    })
}

#[tauri::command]
pub fn list_timelines(db: State<'_, Mutex<Connection>>) -> AppResult<Vec<Timeline>> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let mut stmt = conn.prepare(
        "SELECT id, title, description, created_at, updated_at FROM timelines ORDER BY updated_at DESC",
    )?;

    let timelines = stmt
        .query_map([], |row| {
            Ok(Timeline {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(timelines)
}

#[tauri::command]
pub fn update_timeline(
    db: State<'_, Mutex<Connection>>,
    input: UpdateTimeline,
) -> AppResult<Timeline> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    if let Some(ref title) = input.title {
        conn.execute(
            "UPDATE timelines SET title = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![title, now, input.id],
        )?;
    }
    if let Some(ref desc) = input.description {
        conn.execute(
            "UPDATE timelines SET description = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![desc, now, input.id],
        )?;
    }

    drop(conn);
    get_timeline(db, input.id)
}

#[tauri::command]
pub fn delete_timeline(db: State<'_, Mutex<Connection>>, id: String) -> AppResult<()> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let changes = conn.execute("DELETE FROM timelines WHERE id = ?1", [&id])?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("Timeline {id} not found")));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::db::init_test_db;
    use rusqlite::params;

    #[test]
    fn test_timeline_crud() {
        let conn = init_test_db().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let now = "2024-01-01 00:00:00";

        conn.execute(
            "INSERT INTO timelines (id, title, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, "Test Timeline", "A test", now, now],
        ).unwrap();

        let title: String = conn
            .query_row("SELECT title FROM timelines WHERE id = ?1", [&id], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(title, "Test Timeline");

        conn.execute(
            "UPDATE timelines SET title = ?1 WHERE id = ?2",
            params!["Updated", id],
        )
        .unwrap();
        let title: String = conn
            .query_row("SELECT title FROM timelines WHERE id = ?1", [&id], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(title, "Updated");

        conn.execute("DELETE FROM timelines WHERE id = ?1", [&id])
            .unwrap();
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM timelines WHERE id = ?1",
                [&id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }
}
