import { invoke } from "@tauri-apps/api/core";
import type {
  Timeline,
  Track,
  TimelineEvent,
  Setting,
  Connection,
  Template,
  CreateTimelineInput,
  UpdateTimelineInput,
  CreateTrackInput,
  UpdateTrackInput,
  CreateEventInput,
  UpdateEventInput,
} from "./types";

// Timelines
export const createTimeline = (input: CreateTimelineInput) =>
  invoke<Timeline>("create_timeline", { input });
export const getTimeline = (id: string) =>
  invoke<Timeline>("get_timeline", { id });
export const listTimelines = () => invoke<Timeline[]>("list_timelines");
export const updateTimeline = (input: UpdateTimelineInput) =>
  invoke<Timeline>("update_timeline", { input });
export const deleteTimeline = (id: string) =>
  invoke<void>("delete_timeline", { id });

// Tracks
export const createTrack = (input: CreateTrackInput) =>
  invoke<Track>("create_track", { input });
export const listTracks = (timelineId: string) =>
  invoke<Track[]>("list_tracks", { timelineId });
export const updateTrack = (input: UpdateTrackInput) =>
  invoke<Track>("update_track", { input });
export const deleteTrack = (id: string) =>
  invoke<void>("delete_track", { id });
export const reorderTracks = (trackIds: string[]) =>
  invoke<void>("reorder_tracks", { trackIds });

// Events
export const createEvent = (input: CreateEventInput) =>
  invoke<TimelineEvent>("create_event", { input });
export const getEvent = (id: string) =>
  invoke<TimelineEvent>("get_event", { id });
export const listEvents = (timelineId: string) =>
  invoke<TimelineEvent[]>("list_events", { timelineId });
export const updateEvent = (input: UpdateEventInput) =>
  invoke<TimelineEvent>("update_event", { input });
export const deleteEvent = (id: string) =>
  invoke<void>("delete_event", { id });

// Connections
export interface CreateConnectionInput {
  timelineId: string;
  sourceEventId: string;
  targetEventId: string;
  connectionType?: string;
  label?: string;
  color?: string;
}
export interface UpdateConnectionInput {
  id: string;
  connectionType?: string;
  label?: string;
  color?: string;
}
export const createConnection = (input: CreateConnectionInput) =>
  invoke<Connection>("create_connection", { input });
export const listConnections = (timelineId: string) =>
  invoke<Connection[]>("list_connections", { timelineId });
export const updateConnection = (input: UpdateConnectionInput) =>
  invoke<Connection>("update_connection", { input });
export const deleteConnection = (id: string) =>
  invoke<void>("delete_connection", { id });

// Search
export interface SearchResult {
  eventId: string;
  title: string;
  snippet: string;
  startDate: string;
  trackId: string;
}
export const searchEvents = (timelineId: string, query: string) =>
  invoke<SearchResult[]>("search_events", { timelineId, query });

// Import
export const importJson = (data: string) =>
  invoke<string>("import_json", { data });
export const importCsv = (
  timelineId: string,
  csvData: string,
  columnMapping: Record<string, string>
) => invoke<number>("import_csv", { timelineId, csvData, columnMapping });

// Export
export const exportJson = (timelineId: string) =>
  invoke<string>("export_json", { timelineId });
export const exportCsv = (timelineId: string) =>
  invoke<string>("export_csv", { timelineId });
export const exportMarkdown = (timelineId: string) =>
  invoke<string>("export_markdown", { timelineId });
export const saveFile = (path: string, content: string) =>
  invoke<void>("save_file", { path, content });

// Templates
export const listTemplates = () => invoke<Template[]>("list_templates");
export const createFromTemplate = (templateId: string, title: string) =>
  invoke<string>("create_from_template", { templateId, title });
export const saveAsTemplate = (
  timelineId: string,
  name: string,
  description: string
) => invoke<Template>("save_as_template", { timelineId, name, description });
export const deleteTemplate = (id: string) =>
  invoke<void>("delete_template", { id });

// AI
export interface AiGeneratedEvent {
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  eventType?: string;
  importance?: number;
  confidence?: number;
}
export interface AiChatResponse {
  content: string;
  events: AiGeneratedEvent[];
}
export interface AiModel {
  name: string;
}
export const aiCheckConnection = () =>
  invoke<AiModel[]>("ai_check_connection");
export const aiResearchTopic = (
  topic: string,
  existingEvents: string[],
  maxEvents?: number
) => invoke<AiGeneratedEvent[]>("ai_research_topic", { topic, existingEvents, maxEvents });
export const aiFillGaps = (
  topic: string,
  startDate: string,
  endDate: string,
  existingEvents: string[]
) => invoke<AiGeneratedEvent[]>("ai_fill_gaps", { topic, startDate, endDate, existingEvents });
export const aiGenerateDescription = (
  title: string,
  date: string,
  context?: string
) => invoke<string>("ai_generate_description", { title, date, context });
export const aiSuggestConnections = (events: string[]) =>
  invoke<string>("ai_suggest_connections", { events });
export const aiFactCheck = (
  title: string,
  date: string,
  description: string
) => invoke<string>("ai_fact_check", { title, date, description });
export const aiChat = (
  messages: Array<{ role: string; content: string }>,
  timelineContext?: string
) => invoke<AiChatResponse>("ai_chat", { messages, timelineContext });

// Settings
export const getSetting = (key: string) =>
  invoke<Setting>("get_setting", { key });
export const updateSetting = (key: string, value: string) =>
  invoke<Setting>("update_setting", { key, value });
