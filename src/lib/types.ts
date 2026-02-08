export interface Timeline {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Track {
  id: string;
  timelineId: string;
  name: string;
  color: string;
  sortOrder: number;
  visible: boolean;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  timelineId: string;
  trackId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string | null;
  eventType: EventType;
  importance: number;
  color: string | null;
  icon: string | null;
  imagePath: string | null;
  externalLink: string | null;
  tags: string;
  source: string | null;
  aiGenerated: boolean;
  aiConfidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export type EventType = "point" | "range" | "milestone" | "era";

export interface Connection {
  id: string;
  timelineId: string;
  sourceEventId: string;
  targetEventId: string;
  connectionType: ConnectionType;
  label: string | null;
  color: string | null;
  createdAt: string;
}

export type ConnectionType = "related" | "caused" | "preceded" | "influenced";

export interface Setting {
  key: string;
  value: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  data: string;
  isBuiltin: boolean;
  createdAt: string;
}

// Input types
export interface CreateTimelineInput {
  title: string;
  description?: string;
}

export interface UpdateTimelineInput {
  id: string;
  title?: string;
  description?: string;
}

export interface CreateTrackInput {
  timelineId: string;
  name: string;
  color?: string;
}

export interface UpdateTrackInput {
  id: string;
  name?: string;
  color?: string;
  visible?: boolean;
}

export interface CreateEventInput {
  timelineId: string;
  trackId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  eventType?: EventType;
  importance?: number;
  color?: string;
  icon?: string;
  tags?: string;
  source?: string;
  aiGenerated?: boolean;
  aiConfidence?: number;
}

export interface UpdateEventInput {
  id: string;
  trackId?: string;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  eventType?: string;
  importance?: number;
  color?: string;
  icon?: string;
  imagePath?: string;
  externalLink?: string;
  tags?: string;
  source?: string;
}

export interface BulkUpdateInput {
  ids: string[];
  trackId?: string;
  color?: string;
  importance?: number;
  tags?: string;
}
