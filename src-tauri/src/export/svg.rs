use std::collections::HashMap;
use std::fmt::Write;

use chrono::Timelike;
use rusqlite::Connection;

use crate::error::{AppError, AppResult};

/// Escape text for safe inclusion in XML/SVG content.
fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Parse a date string (YYYY-MM-DD or ISO datetime) to days since Unix epoch.
fn date_to_epoch_days(date_str: &str) -> Option<f64> {
    // Try YYYY-MM-DD first
    if let Ok(nd) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
        let epoch = chrono::NaiveDate::from_ymd_opt(1970, 1, 1)?;
        return Some((nd - epoch).num_days() as f64);
    }
    // Try ISO datetime
    if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(date_str, "%Y-%m-%dT%H:%M:%S") {
        let epoch = chrono::NaiveDate::from_ymd_opt(1970, 1, 1)?;
        let days = (ndt.date() - epoch).num_days() as f64;
        let frac = ndt.time().num_seconds_from_midnight() as f64 / 86400.0;
        return Some(days + frac);
    }
    // Try with timezone suffix (strip it)
    if let Some(stripped) = date_str.get(..19) {
        if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(stripped, "%Y-%m-%dT%H:%M:%S") {
            let epoch = chrono::NaiveDate::from_ymd_opt(1970, 1, 1)?;
            let days = (ndt.date() - epoch).num_days() as f64;
            let frac = ndt.time().num_seconds_from_midnight() as f64 / 86400.0;
            return Some(days + frac);
        }
    }
    None
}

struct TrackInfo {
    id: String,
    name: String,
    color: String,
}

struct EventInfo {
    id: String,
    title: String,
    start_date: String,
    end_date: Option<String>,
    event_type: String,
    track_id: String,
}

struct ConnectionInfo {
    source_event_id: String,
    target_event_id: String,
    label: Option<String>,
}

/// Generate an SVG string for the given timeline.
pub fn generate_svg(conn: &Connection, timeline_id: &str) -> AppResult<String> {
    // Fetch timeline title
    let title: String = conn
        .query_row(
            "SELECT title FROM timelines WHERE id = ?1",
            [timeline_id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::NotFound(format!("Timeline {timeline_id} not found")))?;

    // Fetch tracks
    let mut track_stmt = conn.prepare(
        "SELECT id, name, color FROM tracks WHERE timeline_id = ?1 ORDER BY sort_order",
    )?;
    let tracks: Vec<TrackInfo> = track_stmt
        .query_map([timeline_id], |row| {
            Ok(TrackInfo {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let track_index: HashMap<String, usize> = tracks
        .iter()
        .enumerate()
        .map(|(i, t)| (t.id.clone(), i))
        .collect();

    // Fetch events
    let mut event_stmt = conn.prepare(
        "SELECT id, title, start_date, end_date, event_type, track_id FROM events WHERE timeline_id = ?1 ORDER BY start_date",
    )?;
    let events: Vec<EventInfo> = event_stmt
        .query_map([timeline_id], |row| {
            Ok(EventInfo {
                id: row.get(0)?,
                title: row.get(1)?,
                start_date: row.get(2)?,
                end_date: row.get(3)?,
                event_type: row.get(4)?,
                track_id: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    // Fetch connections
    let mut conn_stmt = conn.prepare(
        "SELECT source_event_id, target_event_id, label FROM connections WHERE timeline_id = ?1",
    )?;
    let connections: Vec<ConnectionInfo> = conn_stmt
        .query_map([timeline_id], |row| {
            Ok(ConnectionInfo {
                source_event_id: row.get(0)?,
                target_event_id: row.get(1)?,
                label: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    // Calculate date range
    let pixels_per_day: f64 = 0.5;
    let track_height: f64 = 60.0;
    let header_height: f64 = 40.0;
    let axis_height: f64 = 40.0;
    let padding: f64 = 20.0;

    let epoch_days: Vec<f64> = events
        .iter()
        .filter_map(|e| date_to_epoch_days(&e.start_date))
        .collect();

    let min_days = epoch_days
        .iter()
        .copied()
        .fold(f64::INFINITY, f64::min);
    let max_days = epoch_days
        .iter()
        .copied()
        .fold(f64::NEG_INFINITY, f64::max);

    // Also consider end dates
    let end_epoch_days: Vec<f64> = events
        .iter()
        .filter_map(|e| e.end_date.as_ref().and_then(|d| date_to_epoch_days(d)))
        .collect();
    let max_days = end_epoch_days
        .iter()
        .copied()
        .fold(max_days, f64::max);

    // Handle empty or single-event timelines
    let (min_days, max_days) = if min_days.is_infinite() || max_days.is_infinite() {
        (0.0, 100.0)
    } else if (max_days - min_days).abs() < 1.0 {
        (min_days - 50.0, max_days + 50.0)
    } else {
        (min_days, max_days)
    };

    let content_width = (max_days - min_days) * pixels_per_day + padding * 2.0;
    let num_tracks = if tracks.is_empty() { 1 } else { tracks.len() };
    let content_height =
        header_height + (num_tracks as f64) * track_height + axis_height + padding * 2.0;

    let width = content_width.max(600.0);
    let height = content_height.max(200.0);

    let mut svg = String::with_capacity(4096);

    // SVG header
    let _ = write!(
        svg,
        r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">"##,
        w = width,
        h = height
    );

    // Background
    let _ = write!(
        svg,
        r##"<rect width="{w}" height="{h}" fill="#ffffff"/>"##,
        w = width,
        h = height
    );

    // Title
    let _ = write!(
        svg,
        r##"<text x="{x}" y="{y}" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#1f2937">{title}</text>"##,
        x = width / 2.0,
        y = header_height / 2.0 + 6.0,
        title = escape_xml(&title)
    );

    // Track lanes
    for (i, track) in tracks.iter().enumerate() {
        let y = header_height + (i as f64) * track_height;
        // Background rect with low opacity
        let _ = write!(
            svg,
            r##"<rect x="0" y="{y}" width="{w}" height="{th}" fill="{color}" opacity="0.1"/>"##,
            y = y,
            w = width,
            th = track_height,
            color = escape_xml(&track.color)
        );
        // Track label
        let _ = write!(
            svg,
            r##"<text x="5" y="{ty}" font-family="sans-serif" font-size="11" fill="#6b7280">{name}</text>"##,
            ty = y + 14.0,
            name = escape_xml(&track.name)
        );
    }

    // Build event position map for connections
    let mut event_positions: HashMap<String, (f64, f64)> = HashMap::new();

    // Events
    for event in &events {
        let start_days = match date_to_epoch_days(&event.start_date) {
            Some(d) => d,
            None => continue,
        };
        let x = (start_days - min_days) * pixels_per_day + padding;
        let track_idx = track_index.get(&event.track_id).copied().unwrap_or(0);
        let y = header_height + (track_idx as f64) * track_height + track_height / 2.0;

        event_positions.insert(event.id.clone(), (x, y));

        let track_color = tracks
            .get(track_idx)
            .map(|t| t.color.as_str())
            .unwrap_or("#6b7280");

        match event.event_type.as_str() {
            "range" | "era" => {
                let end_days = event
                    .end_date
                    .as_ref()
                    .and_then(|d| date_to_epoch_days(d))
                    .unwrap_or(start_days + 30.0);
                let x2 = (end_days - min_days) * pixels_per_day + padding;
                let bar_width = (x2 - x).max(4.0);
                let bar_height = 20.0;
                let bar_y = y - bar_height / 2.0;
                // Rounded rect for range/era
                let _ = write!(
                    svg,
                    r##"<rect x="{x}" y="{by}" width="{bw}" height="{bh}" rx="4" ry="4" fill="{color}" opacity="0.7"/>"##,
                    x = x,
                    by = bar_y,
                    bw = bar_width,
                    bh = bar_height,
                    color = escape_xml(track_color)
                );
                // Label centered on bar
                let label_x = x + bar_width / 2.0;
                let _ = write!(
                    svg,
                    r##"<text x="{lx}" y="{ly}" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#1f2937">{t}</text>"##,
                    lx = label_x,
                    ly = bar_y - 4.0,
                    t = escape_xml(&event.title)
                );
            }
            _ => {
                // Point/milestone: circle
                let _ = write!(
                    svg,
                    r##"<circle cx="{cx}" cy="{cy}" r="6" fill="{color}"/>"##,
                    cx = x,
                    cy = y,
                    color = escape_xml(track_color)
                );
                // Label
                let _ = write!(
                    svg,
                    r##"<text x="{tx}" y="{ty}" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#1f2937">{t}</text>"##,
                    tx = x,
                    ty = y - 10.0,
                    t = escape_xml(&event.title)
                );
            }
        }
    }

    // Connections: curved paths with arrowheads
    let _ = write!(
        svg,
        r##"<defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><path d="M0,0 L8,3 L0,6 Z" fill="#9ca3af"/></marker></defs>"##
    );

    for conn in &connections {
        if let (Some(&(x1, y1)), Some(&(x2, y2))) = (
            event_positions.get(&conn.source_event_id),
            event_positions.get(&conn.target_event_id),
        ) {
            let mid_x = (x1 + x2) / 2.0;
            let ctrl_y = y1.min(y2) - 30.0;
            let _ = write!(
                svg,
                r##"<path d="M{x1},{y1} Q{mx},{cy} {x2},{y2}" fill="none" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#arrowhead)"/>"##,
                x1 = x1,
                y1 = y1,
                mx = mid_x,
                cy = ctrl_y,
                x2 = x2,
                y2 = y2
            );
            // Connection label if present
            if let Some(ref label) = conn.label {
                let _ = write!(
                    svg,
                    r##"<text x="{lx}" y="{ly}" font-family="sans-serif" font-size="9" text-anchor="middle" fill="#9ca3af">{l}</text>"##,
                    lx = mid_x,
                    ly = ctrl_y - 4.0,
                    l = escape_xml(label)
                );
            }
        }
    }

    // Time axis at bottom
    let axis_y = header_height + (num_tracks as f64) * track_height + 10.0;
    let _ = write!(
        svg,
        r##"<line x1="{px}" y1="{ay}" x2="{x2}" y2="{ay}" stroke="#d1d5db" stroke-width="1"/>"##,
        px = padding,
        ay = axis_y,
        x2 = width - padding
    );

    // Axis tick marks (approximately every 365 days)
    let tick_interval_days = 365.0;
    let mut tick_day = (min_days / tick_interval_days).ceil() * tick_interval_days;
    while tick_day <= max_days {
        let tx = (tick_day - min_days) * pixels_per_day + padding;
        if tx >= padding && tx <= width - padding {
            let _ = write!(
                svg,
                r##"<line x1="{tx}" y1="{y1}" x2="{tx}" y2="{y2}" stroke="#d1d5db" stroke-width="1"/>"##,
                tx = tx,
                y1 = axis_y - 4.0,
                y2 = axis_y + 4.0
            );
            // Approximate year label from epoch days
            let approx_year = 1970.0 + tick_day / 365.25;
            let _ = write!(
                svg,
                r##"<text x="{tx}" y="{ty}" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#6b7280">{yr}</text>"##,
                tx = tx,
                ty = axis_y + 18.0,
                yr = approx_year as i64
            );
        }
        tick_day += tick_interval_days;
    }

    svg.push_str("</svg>");

    Ok(svg)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::init_test_db;
    use rusqlite::params;

    fn setup_test_data(conn: &Connection) -> String {
        let tl_id = uuid::Uuid::new_v4().to_string();
        let tr1_id = uuid::Uuid::new_v4().to_string();
        let tr2_id = uuid::Uuid::new_v4().to_string();
        let ev1_id = uuid::Uuid::new_v4().to_string();
        let ev2_id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO timelines (id, title, description) VALUES (?1, ?2, ?3)",
            params![tl_id, "SVG Test Timeline", "For SVG export testing"],
        )
        .expect("insert timeline");

        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, color, sort_order) VALUES (?1, ?2, ?3, ?4, 0)",
            params![tr1_id, tl_id, "Politics", "#ef4444"],
        )
        .expect("insert track 1");

        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, color, sort_order) VALUES (?1, ?2, ?3, ?4, 1)",
            params![tr2_id, tl_id, "Science", "#3b82f6"],
        )
        .expect("insert track 2");

        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, event_type, importance, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'point', 5, 'war')",
            params![ev1_id, tl_id, tr1_id, "Revolution", "The great revolution", "1789-07-14"],
        )
        .expect("insert event 1");

        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, end_date, event_type, importance, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'range', 3, 'science')",
            params![ev2_id, tl_id, tr2_id, "Relativity", "Theory of relativity", "1905-06-30", "1905-09-26"],
        )
        .expect("insert event 2");

        let cid = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO connections (id, timeline_id, source_event_id, target_event_id, connection_type, label)
             VALUES (?1, ?2, ?3, ?4, 'influenced', 'inspired')",
            params![cid, tl_id, ev1_id, ev2_id],
        )
        .expect("insert connection");

        tl_id
    }

    #[test]
    fn test_escape_xml() {
        assert_eq!(escape_xml("a & b"), "a &amp; b");
        assert_eq!(escape_xml("<tag>"), "&lt;tag&gt;");
        assert_eq!(escape_xml(r#"say "hi""#), "say &quot;hi&quot;");
        assert_eq!(escape_xml("plain"), "plain");
    }

    #[test]
    fn test_date_to_epoch_days() {
        // 1970-01-01 should be day 0
        assert_eq!(date_to_epoch_days("1970-01-01"), Some(0.0));
        // 1970-01-02 should be day 1
        assert_eq!(date_to_epoch_days("1970-01-02"), Some(1.0));
        // Invalid date
        assert_eq!(date_to_epoch_days("not-a-date"), None);
        // ISO datetime
        assert!(date_to_epoch_days("2000-01-01T12:00:00").is_some());
    }

    #[test]
    fn test_generate_svg_basic() {
        let conn = init_test_db().expect("init test db");
        let tl_id = setup_test_data(&conn);

        let svg = generate_svg(&conn, &tl_id).expect("generate svg");

        assert!(svg.starts_with("<svg"));
        assert!(svg.ends_with("</svg>"));
        assert!(svg.contains("xmlns"));
        assert!(svg.contains("SVG Test Timeline"));
        assert!(svg.contains("Revolution"));
        assert!(svg.contains("Relativity"));
        assert!(svg.contains("Politics"));
        assert!(svg.contains("Science"));
        // Check for arrowhead marker
        assert!(svg.contains("arrowhead"));
        // Check for connection path
        assert!(svg.contains("<path"));
        // Check for connection label
        assert!(svg.contains("inspired"));
    }

    #[test]
    fn test_generate_svg_not_found() {
        let conn = init_test_db().expect("init test db");
        let result = generate_svg(&conn, "nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn test_generate_svg_empty_timeline() {
        let conn = init_test_db().expect("init test db");
        let tl_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO timelines (id, title, description) VALUES (?1, ?2, ?3)",
            params![tl_id, "Empty", "No events"],
        )
        .expect("insert timeline");

        let svg = generate_svg(&conn, &tl_id).expect("generate svg");
        assert!(svg.starts_with("<svg"));
        assert!(svg.contains("Empty"));
    }

    #[test]
    fn test_generate_svg_xml_escaping() {
        let conn = init_test_db().expect("init test db");
        let tl_id = uuid::Uuid::new_v4().to_string();
        let tr_id = uuid::Uuid::new_v4().to_string();
        let ev_id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO timelines (id, title, description) VALUES (?1, ?2, ?3)",
            params![tl_id, "War & Peace <1800>", "Test"],
        )
        .expect("insert timeline");

        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, color, sort_order) VALUES (?1, ?2, ?3, ?4, 0)",
            params![tr_id, tl_id, "Track \"A\"", "#000000"],
        )
        .expect("insert track");

        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, event_type, importance, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'point', 5, '')",
            params![ev_id, tl_id, tr_id, "Event & <Test>", "desc", "1800-01-01"],
        )
        .expect("insert event");

        let svg = generate_svg(&conn, &tl_id).expect("generate svg");
        assert!(svg.contains("War &amp; Peace &lt;1800&gt;"));
        assert!(svg.contains("Event &amp; &lt;Test&gt;"));
        assert!(svg.contains("Track &quot;A&quot;"));
    }
}
