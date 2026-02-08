use std::collections::HashMap;

use chrono::Timelike;
use rusqlite::Connection;

use crate::error::{AppError, AppResult};

/// Parse a date string (YYYY-MM-DD or ISO datetime) to days since Unix epoch.
fn date_to_epoch_days(date_str: &str) -> Option<f64> {
    if let Ok(nd) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
        let epoch = chrono::NaiveDate::from_ymd_opt(1970, 1, 1)?;
        return Some((nd - epoch).num_days() as f64);
    }
    if let Ok(ndt) = chrono::NaiveDateTime::parse_from_str(date_str, "%Y-%m-%dT%H:%M:%S") {
        let epoch = chrono::NaiveDate::from_ymd_opt(1970, 1, 1)?;
        let days = (ndt.date() - epoch).num_days() as f64;
        let frac = ndt.time().num_seconds_from_midnight() as f64 / 86400.0;
        return Some(days + frac);
    }
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

/// Parse a hex color like "#ef4444" to (r, g, b) as f32 0.0-1.0.
fn hex_to_rgb(hex: &str) -> (f32, f32, f32) {
    let hex = hex.trim_start_matches('#');
    if hex.len() < 6 {
        return (0.4, 0.4, 0.4);
    }
    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(100);
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(100);
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(100);
    (r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0)
}

struct TrackInfo {
    id: String,
    name: String,
    color: String,
}

struct EventInfo {
    title: String,
    start_date: String,
    end_date: Option<String>,
    event_type: String,
    track_id: String,
}

/// Shorthand to create Mm from f64.
fn mm(v: f64) -> printpdf::Mm {
    printpdf::Mm(v as f32)
}

/// Generate a PDF as bytes for the given timeline.
pub fn generate_pdf(conn: &Connection, timeline_id: &str) -> AppResult<Vec<u8>> {
    use printpdf::path::{PaintMode, WindingOrder};
    use printpdf::*;

    // Fetch timeline metadata
    let (title, description): (String, String) = conn
        .query_row(
            "SELECT title, description FROM timelines WHERE id = ?1",
            [timeline_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
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

    let _track_index: HashMap<String, usize> = tracks
        .iter()
        .enumerate()
        .map(|(i, t)| (t.id.clone(), i))
        .collect();

    // Fetch events
    let mut event_stmt = conn.prepare(
        "SELECT title, start_date, end_date, event_type, track_id FROM events WHERE timeline_id = ?1 ORDER BY start_date",
    )?;
    let events: Vec<EventInfo> = event_stmt
        .query_map([timeline_id], |row| {
            Ok(EventInfo {
                title: row.get(0)?,
                start_date: row.get(1)?,
                end_date: row.get(2)?,
                event_type: row.get(3)?,
                track_id: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let event_count = events.len();

    // Calculate date range
    let epoch_days: Vec<f64> = events
        .iter()
        .filter_map(|e| date_to_epoch_days(&e.start_date))
        .collect();

    let min_days = epoch_days.iter().copied().fold(f64::INFINITY, f64::min);
    let max_days = epoch_days.iter().copied().fold(f64::NEG_INFINITY, f64::max);

    let end_days: Vec<f64> = events
        .iter()
        .filter_map(|e| e.end_date.as_ref().and_then(|d| date_to_epoch_days(d)))
        .collect();
    let max_days = end_days.iter().copied().fold(max_days, f64::max);

    let (min_days, max_days) = if min_days.is_infinite() || max_days.is_infinite() {
        (0.0, 100.0)
    } else if (max_days - min_days).abs() < 1.0 {
        (min_days - 50.0, max_days + 50.0)
    } else {
        (min_days, max_days)
    };

    // Date range strings for cover page
    let min_date_str = events
        .first()
        .map(|e| e.start_date.clone())
        .unwrap_or_else(|| "N/A".to_string());
    let max_date_str = events
        .last()
        .and_then(|e| e.end_date.clone().or(Some(e.start_date.clone())))
        .unwrap_or_else(|| "N/A".to_string());

    // Landscape Letter: 792 x 612 points = 279.4 x 215.9 mm
    let page_width = mm(279.4);
    let page_height = mm(215.9);

    // Create document with cover page
    let (doc, cover_page_idx, cover_layer_idx) =
        PdfDocument::new(&title, page_width, page_height, "Cover");

    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| AppError::Internal(format!("Failed to add font: {e}")))?;
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| AppError::Internal(format!("Failed to add bold font: {e}")))?;

    // ── Cover page ──
    let cover_layer = doc.get_page(cover_page_idx).get_layer(cover_layer_idx);

    // Title centered
    cover_layer.begin_text_section();
    cover_layer.set_font(&font_bold, 24.0);
    cover_layer.set_fill_color(Color::Rgb(Rgb::new(0.1, 0.1, 0.1, None)));
    cover_layer.set_text_cursor(mm(50.0), mm(140.0));
    cover_layer.write_text(&title, &font_bold);
    cover_layer.end_text_section();

    // Date range
    let date_range_text = format!("{min_date_str} to {max_date_str}");
    cover_layer.begin_text_section();
    cover_layer.set_font(&font, 12.0);
    cover_layer.set_fill_color(Color::Rgb(Rgb::new(0.4, 0.4, 0.4, None)));
    cover_layer.set_text_cursor(mm(50.0), mm(125.0));
    cover_layer.write_text(&date_range_text, &font);
    cover_layer.end_text_section();

    // Event count
    let count_text = format!("{event_count} events across {} tracks", tracks.len());
    cover_layer.begin_text_section();
    cover_layer.set_font(&font, 10.0);
    cover_layer.set_text_cursor(mm(50.0), mm(115.0));
    cover_layer.write_text(&count_text, &font);
    cover_layer.end_text_section();

    // Description
    if !description.is_empty() {
        let desc_display = if description.len() > 200 {
            format!("{}...", &description[..200])
        } else {
            description.clone()
        };
        cover_layer.begin_text_section();
        cover_layer.set_font(&font, 9.0);
        cover_layer.set_fill_color(Color::Rgb(Rgb::new(0.3, 0.3, 0.3, None)));
        cover_layer.set_text_cursor(mm(50.0), mm(100.0));
        cover_layer.write_text(&desc_display, &font);
        cover_layer.end_text_section();
    }

    // ── Timeline visualization pages ──
    let margin = 20.0_f64; // mm
    let usable_width = 279.4 - margin * 2.0;
    let track_lane_height = 18.0_f64; // mm per track
    let header_space = 15.0_f64;

    let pixels_per_day = 0.15_f64; // mm per day
    let total_width_mm = (max_days - min_days) * pixels_per_day;
    let num_pages = ((total_width_mm / usable_width).ceil() as usize).max(1);

    for page_idx in 0..num_pages {
        let (page_index, layer_index) =
            doc.add_page(page_width, page_height, format!("Timeline-{}", page_idx + 1));
        let layer = doc.get_page(page_index).get_layer(layer_index);

        let page_start_day = min_days + (page_idx as f64 * usable_width / pixels_per_day);
        let page_end_day = page_start_day + usable_width / pixels_per_day;

        // Page header
        let page_label = format!("Page {} of {}", page_idx + 1, num_pages);
        layer.begin_text_section();
        layer.set_font(&font, 8.0);
        layer.set_fill_color(Color::Rgb(Rgb::new(0.4, 0.4, 0.4, None)));
        layer.set_text_cursor(mm(margin), mm(215.9 - 10.0));
        layer.write_text(&page_label, &font);
        layer.end_text_section();

        // Track lanes and events
        for (track_idx, track) in tracks.iter().enumerate() {
            let lane_y_top = 215.9 - header_space - (track_idx as f64) * track_lane_height;
            let lane_y_bottom = lane_y_top - track_lane_height;
            let lane_center_y = (lane_y_top + lane_y_bottom) / 2.0;

            // Track lane background (light tint)
            let (r, g, b) = hex_to_rgb(&track.color);
            let light_r = 1.0 - (1.0 - r) * 0.15;
            let light_g = 1.0 - (1.0 - g) * 0.15;
            let light_b = 1.0 - (1.0 - b) * 0.15;

            layer.set_fill_color(Color::Rgb(Rgb::new(light_r, light_g, light_b, None)));
            let lane_rect = Polygon {
                rings: vec![vec![
                    (Point::new(mm(margin), mm(lane_y_bottom)), false),
                    (Point::new(mm(margin), mm(lane_y_top)), false),
                    (Point::new(mm(279.4 - margin), mm(lane_y_top)), false),
                    (Point::new(mm(279.4 - margin), mm(lane_y_bottom)), false),
                ]],
                mode: PaintMode::Fill,
                winding_order: WindingOrder::NonZero,
            };
            layer.add_polygon(lane_rect);

            // Track name label
            layer.begin_text_section();
            layer.set_font(&font, 7.0);
            layer.set_fill_color(Color::Rgb(Rgb::new(0.3, 0.3, 0.3, None)));
            layer.set_text_cursor(mm(margin + 1.0), mm(lane_y_top - 4.0));
            layer.write_text(&track.name, &font);
            layer.end_text_section();

            // Draw events in this track on this page
            for event in &events {
                if event.track_id != track.id {
                    continue;
                }
                let start_days = match date_to_epoch_days(&event.start_date) {
                    Some(d) => d,
                    None => continue,
                };

                let end_days_val = event
                    .end_date
                    .as_ref()
                    .and_then(|d| date_to_epoch_days(d))
                    .unwrap_or(start_days);

                if end_days_val < page_start_day || start_days > page_end_day {
                    continue;
                }

                let x_start = margin
                    + ((start_days - page_start_day) * pixels_per_day)
                        .max(0.0)
                        .min(usable_width);

                // Truncate label
                let label = if event.title.len() > 30 {
                    format!("{}...", &event.title[..27])
                } else {
                    event.title.clone()
                };

                match event.event_type.as_str() {
                    "range" | "era" => {
                        let x_end = margin
                            + ((end_days_val - page_start_day) * pixels_per_day)
                                .max(0.0)
                                .min(usable_width);
                        let bar_w = (x_end - x_start).max(1.0);
                        let bar_h = 5.0_f64;
                        let bar_y = lane_center_y - bar_h / 2.0;

                        layer.set_fill_color(Color::Rgb(Rgb::new(r, g, b, None)));
                        let bar = Polygon {
                            rings: vec![vec![
                                (Point::new(mm(x_start), mm(bar_y)), false),
                                (Point::new(mm(x_start), mm(bar_y + bar_h)), false),
                                (Point::new(mm(x_start + bar_w), mm(bar_y + bar_h)), false),
                                (Point::new(mm(x_start + bar_w), mm(bar_y)), false),
                            ]],
                            mode: PaintMode::Fill,
                            winding_order: WindingOrder::NonZero,
                        };
                        layer.add_polygon(bar);

                        // Label above bar
                        layer.begin_text_section();
                        layer.set_font(&font, 6.0);
                        layer.set_fill_color(Color::Rgb(Rgb::new(0.1, 0.1, 0.1, None)));
                        layer.set_text_cursor(mm(x_start), mm(bar_y + bar_h + 1.0));
                        layer.write_text(&label, &font);
                        layer.end_text_section();
                    }
                    _ => {
                        // Point/milestone: small filled circle (polygon approximation)
                        let cx = x_start;
                        let cy = lane_center_y;
                        let dot_r = 1.5_f64;
                        let segments = 12;
                        let circle_points: Vec<(Point, bool)> = (0..segments)
                            .map(|i| {
                                let angle = 2.0
                                    * std::f64::consts::PI
                                    * (i as f64)
                                    / (segments as f64);
                                let px = cx + dot_r * angle.cos();
                                let py = cy + dot_r * angle.sin();
                                (Point::new(mm(px), mm(py)), false)
                            })
                            .collect();

                        layer.set_fill_color(Color::Rgb(Rgb::new(r, g, b, None)));
                        let dot = Polygon {
                            rings: vec![circle_points],
                            mode: PaintMode::Fill,
                            winding_order: WindingOrder::NonZero,
                        };
                        layer.add_polygon(dot);

                        // Label above dot
                        layer.begin_text_section();
                        layer.set_font(&font, 6.0);
                        layer.set_fill_color(Color::Rgb(Rgb::new(0.1, 0.1, 0.1, None)));
                        layer.set_text_cursor(mm(cx - 2.0), mm(cy + dot_r + 1.5));
                        layer.write_text(&label, &font);
                        layer.end_text_section();
                    }
                }
            }
        }

        // Time axis at the bottom
        let axis_y = 215.9
            - header_space
            - (tracks.len().max(1) as f64) * track_lane_height
            - 5.0;

        layer.set_outline_color(Color::Rgb(Rgb::new(0.7, 0.7, 0.7, None)));
        layer.set_outline_thickness(0.5);
        let axis_line = Line {
            points: vec![
                (Point::new(mm(margin), mm(axis_y)), false),
                (Point::new(mm(279.4 - margin), mm(axis_y)), false),
            ],
            is_closed: false,
        };
        layer.add_line(axis_line);

        // Tick marks
        let tick_interval_days = 365.0;
        let mut tick_day = (page_start_day / tick_interval_days).ceil() * tick_interval_days;
        while tick_day <= page_end_day {
            let tx = margin + (tick_day - page_start_day) * pixels_per_day;
            if tx >= margin && tx <= 279.4 - margin {
                let tick = Line {
                    points: vec![
                        (Point::new(mm(tx), mm(axis_y - 1.5)), false),
                        (Point::new(mm(tx), mm(axis_y + 1.5)), false),
                    ],
                    is_closed: false,
                };
                layer.add_line(tick);

                let approx_year = 1970.0 + tick_day / 365.25;
                layer.begin_text_section();
                layer.set_font(&font, 7.0);
                layer.set_fill_color(Color::Rgb(Rgb::new(0.4, 0.4, 0.4, None)));
                layer.set_text_cursor(mm(tx - 3.0), mm(axis_y - 4.0));
                layer.write_text(format!("{}", approx_year as i64), &font);
                layer.end_text_section();
            }
            tick_day += tick_interval_days;
        }
    }

    // Save to bytes
    doc.save_to_bytes()
        .map_err(|e| AppError::Internal(format!("PDF generation error: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::init_test_db;
    use rusqlite::params;

    fn setup_test_data(conn: &Connection) -> String {
        let tl_id = uuid::Uuid::new_v4().to_string();
        let tr1_id = uuid::Uuid::new_v4().to_string();
        let ev1_id = uuid::Uuid::new_v4().to_string();
        let ev2_id = uuid::Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO timelines (id, title, description) VALUES (?1, ?2, ?3)",
            params![tl_id, "PDF Test Timeline", "For PDF export testing"],
        )
        .expect("insert timeline");

        conn.execute(
            "INSERT INTO tracks (id, timeline_id, name, color, sort_order) VALUES (?1, ?2, ?3, ?4, 0)",
            params![tr1_id, tl_id, "Events", "#ef4444"],
        )
        .expect("insert track");

        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, event_type, importance, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'point', 5, 'history')",
            params![ev1_id, tl_id, tr1_id, "Battle", "A great battle", "1815-06-18"],
        )
        .expect("insert event 1");

        conn.execute(
            "INSERT INTO events (id, timeline_id, track_id, title, description, start_date, end_date, event_type, importance, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'range', 3, 'science')",
            params![ev2_id, tl_id, tr1_id, "Industrial Rev", "The industrial revolution", "1760-01-01", "1840-12-31"],
        )
        .expect("insert event 2");

        tl_id
    }

    #[test]
    fn test_hex_to_rgb() {
        let (r, g, b) = hex_to_rgb("#ef4444");
        assert!((r - 0.937).abs() < 0.01);
        assert!((g - 0.267).abs() < 0.01);
        assert!((b - 0.267).abs() < 0.01);

        let (r, g, b) = hex_to_rgb("#000000");
        assert!(r.abs() < 0.01);
        assert!(g.abs() < 0.01);
        assert!(b.abs() < 0.01);

        let (r, g, b) = hex_to_rgb("#ffffff");
        assert!((r - 1.0).abs() < 0.01);
        assert!((g - 1.0).abs() < 0.01);
        assert!((b - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_generate_pdf_basic() {
        let conn = init_test_db().expect("init test db");
        let tl_id = setup_test_data(&conn);

        let pdf_bytes = generate_pdf(&conn, &tl_id).expect("generate pdf");

        assert!(pdf_bytes.len() > 100, "PDF should have substantial content");
        assert!(
            pdf_bytes.starts_with(b"%PDF"),
            "PDF should start with %PDF header"
        );
    }

    #[test]
    fn test_generate_pdf_not_found() {
        let conn = init_test_db().expect("init test db");
        let result = generate_pdf(&conn, "nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn test_generate_pdf_empty_timeline() {
        let conn = init_test_db().expect("init test db");
        let tl_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO timelines (id, title, description) VALUES (?1, ?2, ?3)",
            params![tl_id, "Empty PDF", "No events"],
        )
        .expect("insert timeline");

        let pdf_bytes = generate_pdf(&conn, &tl_id).expect("generate pdf");
        assert!(pdf_bytes.starts_with(b"%PDF"));
    }
}
