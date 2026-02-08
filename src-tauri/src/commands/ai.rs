use std::sync::Mutex;

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
    pub start_date: String,
    pub end_date: Option<String>,
    pub event_type: Option<String>,
    pub importance: Option<i32>,
    pub confidence: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct AiChatMessage {
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

    serde_json::from_str::<Vec<AiGeneratedEvent>>(json_str).unwrap_or_default()
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

async fn generate(host: &str, model: &str, prompt: &str, system: &str) -> AppResult<String> {
    let client = reqwest::Client::new();
    let url = format!("{host}/api/generate");

    let body = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "system": system,
        "stream": false,
        "options": {
            "temperature": 0.7,
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

    let system = format!(
        "You are a historical research assistant. Generate a JSON array of timeline events about the given topic. \
        Each event should have: title, description, start_date (ISO format YYYY-MM-DD or YYYY), end_date (optional), \
        event_type (point/range/milestone/era), importance (1-5), confidence (0.0-1.0). \
        Return ONLY a valid JSON array, no other text. Generate up to {max} events.{existing}"
    );

    let response = generate(&host, &model, &topic, &system).await?;
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

    let system = "You are a historical research assistant. Generate timeline events to fill gaps in the given date range. \
        Return ONLY a valid JSON array of events with: title, description, start_date, end_date (optional), \
        event_type, importance (1-5), confidence (0.0-1.0).".to_string();

    let prompt = format!(
        "Topic: {topic}\nDate range: {start_date} to {end_date}\n\nExisting events:\n{}\n\nGenerate events for gaps in this timeline.",
        existing_events.join("\n")
    );

    let response = generate(&host, &model, &prompt, &system).await?;
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

    generate(&host, &model, &prompt, &system).await
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
    generate(&host, &model, &prompt, &system).await
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
    generate(&host, &model, &prompt, &system).await
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
        Each event: {{\"title\": \"...\", \"description\": \"...\", \"start_date\": \"YYYY-MM-DD\", \"end_date\": null, \
        \"event_type\": \"point\", \"importance\": 3, \"confidence\": 0.8}}{}",
        timeline_context.map(|c| format!("\n\nCurrent timeline context:\n{c}")).unwrap_or_default()
    );

    let last_message = messages.last().map(|m| m.content.clone()).unwrap_or_default();
    let response = generate(&host, &model, &last_message, &system).await?;
    let events = parse_events_from_response(&response);

    Ok(AiChatResponse {
        content: response,
        events,
    })
}
