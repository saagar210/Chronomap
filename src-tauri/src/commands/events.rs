use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::db::models::{CreateEvent, Event, UpdateEvent};
use crate::error::{AppError, AppResult};

fn row_to_event(row: &rusqlite::Row<'_>) -> rusqlite::Result<Event> {
    Ok(Event {
        id: row.get(0)?,
        timeline_id: row.get(1)?,
        track_id: row.get(2)?,
        title: row.get(3)?,
        description: row.get(4)?,
        start_date: row.get(5)?,
        end_date: row.get(6)?,
        event_type: row.get(7)?,
        importance: row.get(8)?,
        color: row.get(9)?,
        icon: row.get(10)?,
        image_path: row.get(11)?,
        external_link: row.get(12)?,
        tags: row.get(13)?,
        source: row.get(14)?,
        ai_generated: row.get(15)?,
        ai_confidence: row.get(16)?,
        created_at: row.get(17)?,
        updated_at: row.get(18)?,
    })
}

const EVENT_COLUMNS: &str = "id, timeline_id, track_id, title, description, start_date, end_date, event_type, importance, color, icon, image_path, external_link, tags, source, ai_generated, ai_confidence, created_at, updated_at";

#[tauri::command]
pub fn create_event(db: State<'_, Mutex<Connection>>, input: CreateEvent) -> AppResult<Event> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    if input.title.trim().is_empty() {
        return Err(AppError::Validation("Title is required".to_string()));
    }
    if input.title.len() > 500 {
        return Err(AppError::Validation("Title must be 500 characters or fewer".to_string()));
    }

    let event_type = input.event_type.unwrap_or_else(|| "point".to_string());
    let importance = input.importance.unwrap_or(3);
    let description = input.description.unwrap_or_default();
    let tags = input.tags.unwrap_or_default();
    let ai_generated = input.ai_generated.unwrap_or(false);

    conn.execute(
        "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, end_date, event_type, importance, color, icon, tags, source, ai_generated, ai_confidence, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        rusqlite::params![
            id, input.timeline_id, input.track_id, input.title, description,
            input.start_date, input.end_date, event_type, importance,
            input.color, input.icon, tags, input.source,
            ai_generated, input.ai_confidence, now, now
        ],
    )?;

    let query = format!("SELECT {EVENT_COLUMNS} FROM events WHERE id = ?1");
    conn.query_row(&query, [&id], row_to_event)
        .map_err(AppError::Database)
}

#[tauri::command]
pub fn get_event(db: State<'_, Mutex<Connection>>, id: String) -> AppResult<Event> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let query = format!("SELECT {EVENT_COLUMNS} FROM events WHERE id = ?1");

    conn.query_row(&query, [&id], row_to_event)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => {
                AppError::NotFound(format!("Event {id} not found"))
            }
            other => AppError::Database(other),
        })
}

#[tauri::command]
pub fn list_events(
    db: State<'_, Mutex<Connection>>,
    timeline_id: String,
) -> AppResult<Vec<Event>> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let query = format!(
        "SELECT {EVENT_COLUMNS} FROM events WHERE timeline_id = ?1 ORDER BY start_date"
    );
    let mut stmt = conn.prepare(&query)?;

    let events = stmt
        .query_map([&timeline_id], row_to_event)?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(events)
}

#[tauri::command]
pub fn update_event(db: State<'_, Mutex<Connection>>, input: UpdateEvent) -> AppResult<Event> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // Build dynamic SET clause
    let mut sets = vec!["updated_at = ?1".to_string()];
    let mut param_idx = 2u32;
    let mut params_list: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now)];

    macro_rules! maybe_set {
        ($field:ident, $col:expr) => {
            if let Some(ref val) = input.$field {
                sets.push(format!("{} = ?{}", $col, param_idx));
                params_list.push(Box::new(val.clone()));
                param_idx += 1;
            }
        };
    }

    maybe_set!(track_id, "track_id");
    maybe_set!(title, "title");
    maybe_set!(description, "description");
    maybe_set!(start_date, "start_date");
    maybe_set!(end_date, "end_date");
    maybe_set!(event_type, "event_type");
    maybe_set!(color, "color");
    maybe_set!(icon, "icon");
    maybe_set!(image_path, "image_path");
    maybe_set!(external_link, "external_link");
    maybe_set!(tags, "tags");
    maybe_set!(source, "source");

    if let Some(importance) = input.importance {
        sets.push(format!("importance = ?{param_idx}"));
        params_list.push(Box::new(importance));
    }
    let sql = format!(
        "UPDATE events SET {} WHERE id = ?{}",
        sets.join(", "),
        params_list.len() + 1
    );
    params_list.push(Box::new(input.id.clone()));

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_list.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, params_refs.as_slice())?;

    let query = format!("SELECT {EVENT_COLUMNS} FROM events WHERE id = ?1");
    conn.query_row(&query, [&input.id], row_to_event)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => {
                AppError::NotFound(format!("Event {} not found", input.id))
            }
            other => AppError::Database(other),
        })
}

#[tauri::command]
pub fn delete_event(db: State<'_, Mutex<Connection>>, id: String) -> AppResult<()> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let changes = conn.execute("DELETE FROM events WHERE id = ?1", [&id])?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("Event {id} not found")));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::db::init_test_db;
    use rusqlite::params;

    #[test]
    fn test_event_crud() {
        let conn = init_test_db().unwrap();

        // Create timeline and track first
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

        // Create event
        let ev_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, start_date) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![ev_id, tl_id, tr_id, "Test Event", "2024-01-01"],
        ).unwrap();

        let title: String = conn
            .query_row("SELECT title FROM events WHERE id = ?1", [&ev_id], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(title, "Test Event");

        // Delete
        conn.execute("DELETE FROM events WHERE id = ?1", [&ev_id])
            .unwrap();
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM events WHERE id = ?1",
                [&ev_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_cascade_delete() {
        let conn = init_test_db().unwrap();

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
        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, start_date) VALUES (?1, ?2, ?3, ?4, ?5)",
            params!["e1", tl_id, tr_id, "Event", "2024-01-01"],
        ).unwrap();

        // Delete timeline should cascade
        conn.execute("DELETE FROM timelines WHERE id = ?1", [&tl_id])
            .unwrap();

        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM events", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);

        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM tracks", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }
}
