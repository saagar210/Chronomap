mod ai;
mod commands;
mod db;
mod error;
mod export;

use std::sync::Mutex;

use tauri::Manager;

use commands::{events, settings, timelines, tracks};

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
            let conn =
                db::init_db(&db_path).expect("Failed to initialize database");

            app.manage(Mutex::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            timelines::create_timeline,
            timelines::get_timeline,
            timelines::list_timelines,
            timelines::update_timeline,
            timelines::delete_timeline,
            tracks::create_track,
            tracks::list_tracks,
            tracks::update_track,
            tracks::delete_track,
            tracks::reorder_tracks,
            events::create_event,
            events::get_event,
            events::list_events,
            events::update_event,
            events::delete_event,
            settings::get_setting,
            settings::update_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
