use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Timeline {
    pub id: String,
    pub title: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: String,
    pub timeline_id: String,
    pub name: String,
    pub color: String,
    pub sort_order: i32,
    pub visible: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: String,
    pub timeline_id: String,
    pub track_id: String,
    pub title: String,
    pub description: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub event_type: String,
    pub importance: i32,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub image_path: Option<String>,
    pub external_link: Option<String>,
    pub tags: String,
    pub source: Option<String>,
    pub ai_generated: bool,
    pub ai_confidence: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: String,
    pub timeline_id: String,
    pub source_event_id: String,
    pub target_event_id: String,
    pub connection_type: String,
    pub label: Option<String>,
    pub color: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Setting {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Template {
    pub id: String,
    pub name: String,
    pub description: String,
    pub data: String,
    pub is_builtin: bool,
    pub created_at: String,
}

// Input DTOs (what the frontend sends)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTimeline {
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTimeline {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTrack {
    pub timeline_id: String,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTrack {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
    pub visible: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEvent {
    pub timeline_id: String,
    pub track_id: String,
    pub title: String,
    pub description: Option<String>,
    pub start_date: String,
    pub end_date: Option<String>,
    pub event_type: Option<String>,
    pub importance: Option<i32>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub tags: Option<String>,
    pub source: Option<String>,
    pub ai_generated: Option<bool>,
    pub ai_confidence: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEvent {
    pub id: String,
    pub track_id: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub event_type: Option<String>,
    pub importance: Option<i32>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub image_path: Option<String>,
    pub external_link: Option<String>,
    pub tags: Option<String>,
    pub source: Option<String>,
}
