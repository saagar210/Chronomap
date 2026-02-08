use std::sync::Mutex;

use rusqlite::Connection;
use tauri::State;

use crate::db::models::Connection as ConnModel;
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConnection {
    pub timeline_id: String,
    pub source_event_id: String,
    pub target_event_id: String,
    pub connection_type: Option<String>,
    pub label: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateConnection {
    pub id: String,
    pub connection_type: Option<String>,
    pub label: Option<String>,
    pub color: Option<String>,
}

fn row_to_connection(row: &rusqlite::Row<'_>) -> rusqlite::Result<ConnModel> {
    Ok(ConnModel {
        id: row.get(0)?,
        timeline_id: row.get(1)?,
        source_event_id: row.get(2)?,
        target_event_id: row.get(3)?,
        connection_type: row.get(4)?,
        label: row.get(5)?,
        color: row.get(6)?,
        created_at: row.get(7)?,
    })
}

#[tauri::command]
pub fn create_connection(
    db: State<'_, Mutex<Connection>>,
    input: CreateConnection,
) -> AppResult<ConnModel> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let conn_type = input.connection_type.unwrap_or_else(|| "related".to_string());

    conn.execute(
        "INSERT INTO connections (id, timeline_id, source_event_id, target_event_id, connection_type, label, color, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![id, input.timeline_id, input.source_event_id, input.target_event_id, conn_type, input.label, input.color, now],
    )?;

    conn.query_row(
        "SELECT id, timeline_id, source_event_id, target_event_id, connection_type, label, color, created_at FROM connections WHERE id = ?1",
        [&id],
        row_to_connection,
    ).map_err(AppError::Database)
}

#[tauri::command]
pub fn list_connections(
    db: State<'_, Mutex<Connection>>,
    timeline_id: String,
) -> AppResult<Vec<ConnModel>> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let mut stmt = conn.prepare(
        "SELECT id, timeline_id, source_event_id, target_event_id, connection_type, label, color, created_at FROM connections WHERE timeline_id = ?1",
    )?;
    let results = stmt
        .query_map([&timeline_id], row_to_connection)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(results)
}

#[tauri::command]
pub fn update_connection(
    db: State<'_, Mutex<Connection>>,
    input: UpdateConnection,
) -> AppResult<ConnModel> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;

    if let Some(ref ct) = input.connection_type {
        conn.execute("UPDATE connections SET connection_type = ?1 WHERE id = ?2", rusqlite::params![ct, input.id])?;
    }
    if let Some(ref label) = input.label {
        conn.execute("UPDATE connections SET label = ?1 WHERE id = ?2", rusqlite::params![label, input.id])?;
    }
    if let Some(ref color) = input.color {
        conn.execute("UPDATE connections SET color = ?1 WHERE id = ?2", rusqlite::params![color, input.id])?;
    }

    conn.query_row(
        "SELECT id, timeline_id, source_event_id, target_event_id, connection_type, label, color, created_at FROM connections WHERE id = ?1",
        [&input.id],
        row_to_connection,
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("Connection {} not found", input.id)),
        other => AppError::Database(other),
    })
}

#[tauri::command]
pub fn delete_connection(db: State<'_, Mutex<Connection>>, id: String) -> AppResult<()> {
    let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    let changes = conn.execute("DELETE FROM connections WHERE id = ?1", [&id])?;
    if changes == 0 {
        return Err(AppError::NotFound(format!("Connection {id} not found")));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::db::init_test_db;
    use rusqlite::params;

    fn setup_timeline_with_events(conn: &rusqlite::Connection) -> (String, String, String, String) {
        let tl_id = uuid::Uuid::new_v4().to_string();
        let tr_id = uuid::Uuid::new_v4().to_string();
        let ev1_id = uuid::Uuid::new_v4().to_string();
        let ev2_id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO timelines (id, title) VALUES (?1, ?2)",
            params![tl_id, "Test TL"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name) VALUES (?1, ?2, ?3)",
            params![tr_id, tl_id, "Track 1"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, start_date) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![ev1_id, tl_id, tr_id, "Event A", "2024-01-01"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, start_date) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![ev2_id, tl_id, tr_id, "Event B", "2024-06-01"],
        )
        .unwrap();

        (tl_id, tr_id, ev1_id, ev2_id)
    }

    #[test]
    fn test_create_connection() {
        let conn = init_test_db().unwrap();
        let (tl_id, _, ev1_id, ev2_id) = setup_timeline_with_events(&conn);

        let conn_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO connections (id, timeline_id, source_event_id, target_event_id, connection_type, label, color)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![conn_id, tl_id, ev1_id, ev2_id, "causes", "led to", "#ff0000"],
        )
        .unwrap();

        let (ct, label): (String, Option<String>) = conn
            .query_row(
                "SELECT connection_type, label FROM connections WHERE id = ?1",
                [&conn_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(ct, "causes");
        assert_eq!(label.as_deref(), Some("led to"));
    }

    #[test]
    fn test_list_connections() {
        let conn = init_test_db().unwrap();
        let (tl_id, _, ev1_id, ev2_id) = setup_timeline_with_events(&conn);

        // Insert two connections
        for i in 0..2 {
            let cid = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO connections (id, timeline_id, source_event_id, target_event_id, connection_type)
                 VALUES (?1, ?2, ?3, ?4, 'related')",
                params![cid, tl_id, ev1_id, ev2_id],
            )
            .unwrap();
            let _ = i;
        }

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM connections WHERE timeline_id = ?1",
                [&tl_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn test_update_connection() {
        let conn = init_test_db().unwrap();
        let (tl_id, _, ev1_id, ev2_id) = setup_timeline_with_events(&conn);

        let conn_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO connections (id, timeline_id, source_event_id, target_event_id, connection_type)
             VALUES (?1, ?2, ?3, ?4, 'related')",
            params![conn_id, tl_id, ev1_id, ev2_id],
        )
        .unwrap();

        conn.execute(
            "UPDATE connections SET connection_type = ?1, label = ?2 WHERE id = ?3",
            params!["causes", "updated label", conn_id],
        )
        .unwrap();

        let (ct, label): (String, Option<String>) = conn
            .query_row(
                "SELECT connection_type, label FROM connections WHERE id = ?1",
                [&conn_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(ct, "causes");
        assert_eq!(label.as_deref(), Some("updated label"));
    }

    #[test]
    fn test_delete_connection() {
        let conn = init_test_db().unwrap();
        let (tl_id, _, ev1_id, ev2_id) = setup_timeline_with_events(&conn);

        let conn_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO connections (id, timeline_id, source_event_id, target_event_id, connection_type)
             VALUES (?1, ?2, ?3, ?4, 'related')",
            params![conn_id, tl_id, ev1_id, ev2_id],
        )
        .unwrap();

        conn.execute("DELETE FROM connections WHERE id = ?1", [&conn_id])
            .unwrap();

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM connections WHERE id = ?1",
                [&conn_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_cascade_delete_source_event_removes_connections() {
        let conn = init_test_db().unwrap();
        let (tl_id, _, ev1_id, ev2_id) = setup_timeline_with_events(&conn);

        let conn_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO connections (id, timeline_id, source_event_id, target_event_id, connection_type)
             VALUES (?1, ?2, ?3, ?4, 'related')",
            params![conn_id, tl_id, ev1_id, ev2_id],
        )
        .unwrap();

        // Delete source event - should cascade to connections
        conn.execute("DELETE FROM events WHERE id = ?1", [&ev1_id])
            .unwrap();

        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM connections", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_cascade_delete_target_event_removes_connections() {
        let conn = init_test_db().unwrap();
        let (tl_id, _, ev1_id, ev2_id) = setup_timeline_with_events(&conn);

        let conn_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO connections (id, timeline_id, source_event_id, target_event_id, connection_type)
             VALUES (?1, ?2, ?3, ?4, 'related')",
            params![conn_id, tl_id, ev1_id, ev2_id],
        )
        .unwrap();

        // Delete target event - should cascade to connections
        conn.execute("DELETE FROM events WHERE id = ?1", [&ev2_id])
            .unwrap();

        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM connections", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }
}
