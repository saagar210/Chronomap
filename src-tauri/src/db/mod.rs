pub mod migrations;
pub mod models;

use std::path::Path;

use rusqlite::Connection;

use crate::error::AppResult;

pub fn init_db(db_path: &Path) -> AppResult<Connection> {
    let conn = Connection::open(db_path)?;

    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;",
    )?;

    migrations::run_migrations(&conn)?;

    tracing::info!("Database initialized at {:?}", db_path);
    Ok(conn)
}

#[cfg(test)]
pub fn init_test_db() -> AppResult<Connection> {
    let conn = Connection::open_in_memory()?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    migrations::run_migrations(&conn)?;
    Ok(conn)
}
