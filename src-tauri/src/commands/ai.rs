use std::sync::Mutex;

use chrono::NaiveDate;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiModel {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGeneratedEvent {
    pub title: String,
    pub description: String,
    #[serde(alias = "start_date")]
    pub start_date: String,
    #[serde(alias = "end_date")]
    pub end_date: Option<String>,
    #[serde(alias = "event_type")]
    pub event_type: Option<String>,
    pub importance: Option<i32>,
    pub confidence: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatMessage {
    /// Used by frontend to indicate sender; deserialized but not read in Rust.
    #[allow(dead_code)]
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatResponse {
    pub content: String,
    pub events: Vec<AiGeneratedEvent>,
}

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
}

#[derive(Debug, Deserialize)]
struct OllamaGenerateResponse {
    response: String,
}

fn get_ai_settings(conn: &Connection) -> (String, String) {
    let host = conn
        .query_row("SELECT value FROM settings WHERE key = 'ai_host'", [], |r| r.get::<_, String>(0))
        .unwrap_or_else(|_| "http://localhost:11434".to_string());
    let model = conn
        .query_row("SELECT value FROM settings WHERE key = 'ai_model'", [], |r| r.get::<_, String>(0))
        .unwrap_or_else(|_| "llama3.2".to_string());
    (host, model)
}

fn parse_events_from_response(text: &str) -> Vec<AiGeneratedEvent> {
    // Try to extract JSON array from response
    let json_str = if let Some(start) = text.find('[') {
        if let Some(end) = text.rfind(']') {
            &text[start..=end]
        } else {
            return Vec::new();
        }
    } else if let Some(start) = text.find("```json") {
        let after = &text[start + 7..];
        if let Some(end) = after.find("```") {
            after[..end].trim()
        } else {
            return Vec::new();
        }
    } else {
        return Vec::new();
    };

    serde_json::from_str::<Vec<AiGeneratedEvent>>(json_str)
        .unwrap_or_default()
        .into_iter()
        .filter_map(normalize_generated_event)
        .collect()
}

fn normalize_generated_event(event: AiGeneratedEvent) -> Option<AiGeneratedEvent> {
    let title = event.title.trim().to_string();
    if title.is_empty() {
        return None;
    }

    let start_date = normalize_date(&event.start_date)?;
    let end_date = event
        .end_date
        .as_deref()
        .and_then(normalize_date);

    Some(AiGeneratedEvent {
        title,
        description: event.description.trim().to_string(),
        start_date,
        end_date,
        event_type: Some(normalize_event_type(event.event_type.as_deref())),
        importance: Some(normalize_importance(event.importance.unwrap_or(3))),
        confidence: normalize_confidence(event.confidence),
    })
}

fn normalize_date(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    if trimmed.len() == 4 && trimmed.chars().all(|c| c.is_ascii_digit()) {
        return Some(trimmed.to_string());
    }

    if trimmed.len() == 7
        && trimmed.as_bytes().get(4) == Some(&b'-')
        && trimmed.chars().enumerate().all(|(i, ch)| i == 4 || ch.is_ascii_digit())
    {
        return Some(trimmed.to_string());
    }

    if let Ok(date) = NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
        return Some(date.format("%Y-%m-%d").to_string());
    }

    for fmt in [
        "%B %d, %Y",
        "%B %-d, %Y",
        "%b %d, %Y",
        "%b %-d, %Y",
        "%d %B %Y",
        "%-d %B %Y",
        "%Y/%m/%d",
    ] {
        if let Ok(date) = NaiveDate::parse_from_str(trimmed, fmt) {
            return Some(date.format("%Y-%m-%d").to_string());
        }
    }

    None
}

fn normalize_event_type(raw: Option<&str>) -> String {
    let normalized = raw.unwrap_or("point").trim().to_lowercase();
    match normalized.as_str() {
        "point" | "range" | "milestone" | "era" => normalized,
        value if value.contains("era") || value.contains("period") => "era".to_string(),
        value if value.contains("range")
            || value.contains("span")
            || value.contains("campaign")
            || value.contains("mission") =>
        {
            "range".to_string()
        }
        value if value.contains("milestone")
            || value.contains("launch")
            || value.contains("landing")
            || value.contains("first")
            || value.contains("breakthrough") =>
        {
            "milestone".to_string()
        }
        _ => "point".to_string(),
    }
}

fn normalize_importance(raw: i32) -> i32 {
    raw.clamp(1, 5)
}

fn normalize_confidence(raw: Option<f64>) -> Option<f64> {
    let value = raw?;
    let normalized = if (0.0..=1.0).contains(&value) {
        value
    } else if value <= 10.0 {
        value / 10.0
    } else if value <= 100.0 {
        value / 100.0
    } else {
        return None;
    };

    Some(normalized.clamp(0.0, 1.0))
}

#[tauri::command]
pub async fn ai_check_connection(db: State<'_, Mutex<Connection>>) -> AppResult<Vec<AiModel>> {
    let (host, _) = {
        let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        get_ai_settings(&conn)
    };

    let url = format!("{host}/api/tags");
    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Ollama not reachable: {e}")))?;

    let tags: OllamaTagsResponse = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Invalid response: {e}")))?;

    Ok(tags.models.into_iter().map(|m| AiModel { name: m.name }).collect())
}

async fn generate(
    host: &str,
    model: &str,
    prompt: &str,
    system: &str,
    temperature: f64,
) -> AppResult<String> {
    let client = reqwest::Client::new();
    let url = format!("{host}/api/generate");

    let body = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": false,
        "options": {
            "temperature": temperature,
            "num_predict": 4096
        }
    });

    let resp = client
        .post(&url)
        .json(&body)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Ollama request failed: {e}")))?;

    let result: OllamaGenerateResponse = resp
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Invalid response: {e}")))?;

    Ok(result.response)
}

fn structured_event_system(extra_rules: &str) -> String {
    format!(
        "You are a historical research assistant. Return ONLY a valid JSON array. \
        Every event object must include title, description, start_date, end_date, event_type, importance, confidence. \
        Date rules: start_date and end_date must be ISO strings in YYYY-MM-DD, YYYY-MM, or YYYY format only. \
        event_type must be one of point, range, milestone, era. \
        importance must be an integer from 1 to 5. \
        confidence must be a decimal from 0.0 to 1.0. \
        Do not include markdown fences or explanatory text. {extra_rules}"
    )
}

#[tauri::command]
pub async fn ai_research_topic(
    db: State<'_, Mutex<Connection>>,
    topic: String,
    existing_events: Vec<String>,
    max_events: Option<u32>,
) -> AppResult<Vec<AiGeneratedEvent>> {
    let (host, model) = {
        let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        get_ai_settings(&conn)
    };

    let max = max_events.unwrap_or(10);
    let existing = if existing_events.is_empty() {
        String::new()
    } else {
        format!("\n\nExisting events on the timeline (avoid duplicates):\n{}", existing_events.join("\n"))
    };

    let system = structured_event_system(&format!(
        "Generate up to {max} events about the topic. Avoid duplicates with these existing events: {existing}"
    ));

    let response = generate(&host, &model, &topic, &system, 0.2).await?;
    Ok(parse_events_from_response(&response))
}

#[tauri::command]
pub async fn ai_fill_gaps(
    db: State<'_, Mutex<Connection>>,
    topic: String,
    start_date: String,
    end_date: String,
    existing_events: Vec<String>,
) -> AppResult<Vec<AiGeneratedEvent>> {
    let (host, model) = {
        let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        get_ai_settings(&conn)
    };

    let system = structured_event_system(
        "Generate timeline events only for meaningful gaps in the supplied range.",
    );

    let prompt = format!(
        "Topic: {topic}\nDate range: {start_date} to {end_date}\n\nExisting events:\n{}\n\nGenerate events for gaps in this timeline.",
        existing_events.join("\n")
    );

    let response = generate(&host, &model, &prompt, &system, 0.2).await?;
    Ok(parse_events_from_response(&response))
}

#[tauri::command]
pub async fn ai_generate_description(
    db: State<'_, Mutex<Connection>>,
    title: String,
    date: String,
    context: Option<String>,
) -> AppResult<String> {
    let (host, model) = {
        let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        get_ai_settings(&conn)
    };

    let system = "You are a historical research assistant. Write a concise, informative description (2-4 paragraphs) \
        for the given timeline event. Use Markdown formatting. Be factual and cite specific details.".to_string();

    let prompt = format!(
        "Event: {title}\nDate: {date}{}",
        context.map(|c| format!("\nContext: {c}")).unwrap_or_default()
    );

    generate(&host, &model, &prompt, &system, 0.4).await
}

#[tauri::command]
pub async fn ai_suggest_connections(
    db: State<'_, Mutex<Connection>>,
    events: Vec<String>,
) -> AppResult<String> {
    let (host, model) = {
        let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        get_ai_settings(&conn)
    };

    let system = "You are a historical analysis assistant. Given a list of timeline events, suggest connections \
        between related events. Return a JSON array of objects with: source_title, target_title, connection_type \
        (caused/related/preceded/influenced), label (brief description of the relationship).".to_string();

    let prompt = format!("Events:\n{}", events.join("\n"));
    generate(&host, &model, &prompt, &system, 0.2).await
}

#[tauri::command]
pub async fn ai_fact_check(
    db: State<'_, Mutex<Connection>>,
    title: String,
    date: String,
    description: String,
) -> AppResult<String> {
    let (host, model) = {
        let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        get_ai_settings(&conn)
    };

    let system = "You are a fact-checking assistant. Evaluate the accuracy of the given timeline event. \
        Provide a confidence score (0-100%), note any inaccuracies, and suggest corrections if needed.".to_string();

    let prompt = format!("Event: {title}\nDate: {date}\nDescription: {description}");
    generate(&host, &model, &prompt, &system, 0.3).await
}

#[tauri::command]
pub async fn ai_chat(
    db: State<'_, Mutex<Connection>>,
    messages: Vec<AiChatMessage>,
    timeline_context: Option<String>,
) -> AppResult<AiChatResponse> {
    let (host, model) = {
        let conn = db.lock().map_err(|e| AppError::Internal(e.to_string()))?;
        get_ai_settings(&conn)
    };

    let system = format!(
        "You are a helpful timeline research assistant. Help the user research historical topics and create timeline events. \
        When suggesting events, include them as a JSON array in your response wrapped in ```json blocks. \
        Each event must use this exact shape: {{\"title\": \"...\", \"description\": \"...\", \"start_date\": \"YYYY-MM-DD\", \"end_date\": null, \
        \"event_type\": \"point\", \"importance\": 3, \"confidence\": 0.8}}. \
        start_date and end_date must always be ISO strings. event_type must be one of point, range, milestone, era. \
        importance must be an integer from 1 to 5. confidence must be a decimal from 0.0 to 1.0.{}",
        timeline_context.map(|c| format!("\n\nCurrent timeline context:\n{c}")).unwrap_or_default()
    );

    let last_message = messages.last().map(|m| m.content.clone()).unwrap_or_default();
    let response = generate(&host, &model, &last_message, &system, 0.4).await?;
    let events = parse_events_from_response(&response);

    Ok(AiChatResponse {
        content: response,
        events,
    })
}

#[cfg(test)]
mod tests {
    use super::{normalize_confidence, normalize_date, normalize_event_type, parse_events_from_response};

    #[test]
    fn normalizes_common_non_iso_dates() {
        assert_eq!(normalize_date("July 16, 1969").as_deref(), Some("1969-07-16"));
        assert_eq!(normalize_date("1969").as_deref(), Some("1969"));
        assert_eq!(normalize_date("1969-07").as_deref(), Some("1969-07"));
    }

    #[test]
    fn normalizes_event_type_and_confidence_ranges() {
        assert_eq!(normalize_event_type(Some("Launch")), "milestone");
        assert_eq!(normalize_event_type(Some("Campaign")), "range");
        assert_eq!(normalize_confidence(Some(10.0)), Some(1.0));
        assert_eq!(normalize_confidence(Some(85.0)), Some(0.85));
    }

    #[test]
    fn parse_events_from_response_salvages_usable_events() {
        let raw = r#"
        [
          {
            "title": "Launch of Apollo 11",
            "description": "Moon mission begins",
            "start_date": "July 16, 1969",
            "end_date": "July 24, 1969",
            "event_type": "Launch",
            "importance": 10,
            "confidence": 10
          }
        ]
        "#;

        let events = parse_events_from_response(raw);
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].start_date, "1969-07-16");
        assert_eq!(events[0].event_type.as_deref(), Some("milestone"));
        assert_eq!(events[0].importance, Some(5));
        assert_eq!(events[0].confidence, Some(1.0));
    }
}
