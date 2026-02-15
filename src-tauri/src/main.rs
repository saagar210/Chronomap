// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "linux")]
compile_error!("ChronoMap desktop builds are supported only on macOS and Windows.");

fn main() {
    chronomap_lib::run()
}
