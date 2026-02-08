import { invoke } from "@tauri-apps/api/core";
import type {
  Timeline,
  Track,
  TimelineEvent,
  Setting,
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

// Settings
export const getSetting = (key: string) =>
  invoke<Setting>("get_setting", { key });

export const updateSetting = (key: string, value: string) =>
  invoke<Setting>("update_setting", { key, value });
