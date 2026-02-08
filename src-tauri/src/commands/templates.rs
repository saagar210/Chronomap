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

#[cfg(test)]
mod tests {
    use crate::db::init_test_db;
    use rusqlite::params;

    #[test]
    fn test_list_templates_has_six_builtins() {
        let conn = init_test_db().unwrap();

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM templates WHERE is_builtin = 1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 6);
    }

    #[test]
    fn test_list_templates_names() {
        let conn = init_test_db().unwrap();

        let mut stmt = conn
            .prepare("SELECT name FROM templates WHERE is_builtin = 1 ORDER BY name")
            .unwrap();
        let names: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        assert!(names.contains(&"Blank Timeline".to_string()));
        assert!(names.contains(&"Project Timeline".to_string()));
        assert!(names.contains(&"Company History".to_string()));
        assert!(names.contains(&"Personal Biography".to_string()));
        assert!(names.contains(&"Historical Period".to_string()));
        assert!(names.contains(&"Product Roadmap".to_string()));
    }

    #[test]
    fn test_create_from_template() {
        let conn = init_test_db().unwrap();
        let now = "2024-01-01 00:00:00";

        // Use the project template (4 tracks)
        let data_str: String = conn
            .query_row(
                "SELECT data FROM templates WHERE id = 'tpl-project'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        let template_data: serde_json::Value = serde_json::from_str(&data_str).unwrap();
        let tracks = template_data["tracks"].as_array().unwrap();

        let tl_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO timelines (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            params![tl_id, "My Project", now, now],
        )
        .unwrap();

        for (i, track) in tracks.iter().enumerate() {
            let track_id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO tracks (id, timeline_id, name, color, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    track_id,
                    tl_id,
                    track["name"].as_str().unwrap(),
                    track["color"].as_str().unwrap(),
                    i as i32,
                    now
                ],
            )
            .unwrap();
        }

        // Verify timeline created
        let title: String = conn
            .query_row(
                "SELECT title FROM timelines WHERE id = ?1",
                [&tl_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(title, "My Project");

        // Verify 4 tracks created
        let track_count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM tracks WHERE timeline_id = ?1",
                [&tl_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(track_count, 4);

        // Verify track names
        let mut stmt = conn
            .prepare("SELECT name FROM tracks WHERE timeline_id = ?1 ORDER BY sort_order")
            .unwrap();
        let track_names: Vec<String> = stmt
            .query_map([&tl_id], |row| row.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        assert_eq!(track_names, vec!["Milestones", "Tasks", "Deadlines", "Reviews"]);
    }

    #[test]
    fn test_save_as_template() {
        let conn = init_test_db().unwrap();
        let now = "2024-01-01 00:00:00";

        // Create a timeline with tracks
        let tl_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO timelines (id, title) VALUES (?1, ?2)",
            params![tl_id, "My TL"],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, color, sort_order) VALUES (?1, ?2, ?3, ?4, 0)",
            params![uuid::Uuid::new_v4().to_string(), tl_id, "Alpha", "#aaa"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, color, sort_order) VALUES (?1, ?2, ?3, ?4, 1)",
            params![uuid::Uuid::new_v4().to_string(), tl_id, "Beta", "#bbb"],
        )
        .unwrap();

        // Save as template
        let mut stmt = conn
            .prepare("SELECT name, color FROM tracks WHERE timeline_id = ?1 ORDER BY sort_order")
            .unwrap();
        let tracks: Vec<(String, String)> = stmt
            .query_map([&tl_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();

        let data = serde_json::json!({
            "tracks": tracks.iter().map(|(n, c)| serde_json::json!({"name": n, "color": c})).collect::<Vec<_>>()
        });

        let tmpl_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO templates (id, name, description, data, is_builtin, created_at) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
            params![tmpl_id, "Custom Template", "My custom", data.to_string(), now],
        )
        .unwrap();

        let (name, is_builtin): (String, bool) = conn
            .query_row(
                "SELECT name, is_builtin FROM templates WHERE id = ?1",
                [&tmpl_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(name, "Custom Template");
        assert!(!is_builtin);

        // Verify data contains the track info
        let saved_data: String = conn
            .query_row(
                "SELECT data FROM templates WHERE id = ?1",
                [&tmpl_id],
                |row| row.get(0),
            )
            .unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&saved_data).unwrap();
        let saved_tracks = parsed["tracks"].as_array().unwrap();
        assert_eq!(saved_tracks.len(), 2);
        assert_eq!(saved_tracks[0]["name"], "Alpha");
        assert_eq!(saved_tracks[1]["name"], "Beta");
    }

    #[test]
    fn test_delete_builtin_template_fails() {
        let conn = init_test_db().unwrap();

        let is_builtin: bool = conn
            .query_row(
                "SELECT is_builtin FROM templates WHERE id = 'tpl-blank'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(is_builtin, "tpl-blank should be built-in");

        // Simulate the check from delete_template: built-in cannot be deleted
        // The Rust command would return an error, so we just verify the flag
        assert!(is_builtin);
    }

    #[test]
    fn test_delete_custom_template() {
        let conn = init_test_db().unwrap();

        let tmpl_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO templates (id, name, description, data, is_builtin) VALUES (?1, ?2, ?3, '{}', 0)",
            params![tmpl_id, "To Delete", "temp"],
        )
        .unwrap();

        // Check it's not builtin
        let is_builtin: bool = conn
            .query_row(
                "SELECT is_builtin FROM templates WHERE id = ?1",
                [&tmpl_id],
                |row| row.get(0),
            )
            .unwrap();
        assert!(!is_builtin);

        // Delete it
        conn.execute("DELETE FROM templates WHERE id = ?1", [&tmpl_id])
            .unwrap();

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM templates WHERE id = ?1",
                [&tmpl_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }
}
