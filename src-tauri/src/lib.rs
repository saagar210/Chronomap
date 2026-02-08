mod ai;
mod commands;
mod db;
mod error;
mod export;

use std::sync::Mutex;

use tauri::Manager;

use commands::{
    ai as ai_cmd, connections, events, export as export_cmd, import, search, settings, templates,
    timelines, tracks,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");

            let db_path = app_dir.join("chronomap.db");
            let conn = db::init_db(&db_path).expect("Failed to initialize database");

            app.manage(Mutex::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Timelines
            timelines::create_timeline,
            timelines::get_timeline,
            timelines::list_timelines,
            timelines::update_timeline,
            timelines::delete_timeline,
            // Tracks
            tracks::create_track,
            tracks::list_tracks,
            tracks::update_track,
            tracks::delete_track,
            tracks::reorder_tracks,
            // Events
            events::create_event,
            events::get_event,
            events::list_events,
            events::update_event,
            events::delete_event,
            events::bulk_delete_events,
            events::bulk_update_events,
            // Connections
            connections::create_connection,
            connections::list_connections,
            connections::update_connection,
            connections::delete_connection,
            // Search
            search::search_events,
            // Import
            import::import_json,
            import::import_csv,
            // Export
            export_cmd::export_json,
            export_cmd::export_csv,
            export_cmd::export_markdown,
            export_cmd::save_file,
            export_cmd::read_file,
            export_cmd::show_save_dialog,
            export_cmd::show_open_dialog,
            export_cmd::export_svg,
            export_cmd::export_pdf,
            // Templates
            templates::list_templates,
            templates::create_from_template,
            templates::save_as_template,
            templates::delete_template,
            // AI
            ai_cmd::ai_check_connection,
            ai_cmd::ai_research_topic,
            ai_cmd::ai_fill_gaps,
            ai_cmd::ai_generate_description,
            ai_cmd::ai_suggest_connections,
            ai_cmd::ai_fact_check,
            ai_cmd::ai_chat,
            // Settings
            settings::get_setting,
            settings::update_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
