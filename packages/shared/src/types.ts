// ============================================================
// Domain Types for Calendar/Todo Management System
// ============================================================

/** User account (client-safe — excludes password_hash which is server-only) */
export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

/** Calendar container for events and todos */
export interface Calendar {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_visible: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Calendar event */
export interface Event {
  id: string;
  user_id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  color: string | null;
  recurrence_rule_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Recurrence rule (RFC 5545 RRULE format) */
export interface RecurrenceRule {
  id: string;
  user_id: string;
  rrule_string: string;
  created_at: string;
}

/** Exception to a recurring event (skip or modify one occurrence) */
export interface EventException {
  id: string;
  user_id: string;
  event_id: string;
  original_date: string;
  action: 'skip' | 'modify';
  modified_title: string | null;
  modified_start_time: string | null;
  modified_end_time: string | null;
  modified_location: string | null;
  modified_description: string | null;
  modified_color: string | null;
  modified_calendar_id: string | null;
  created_at: string;
  updated_at: string;
}

/** Todo item */
export interface Todo {
  id: string;
  user_id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  is_completed: boolean;
  completed_at: string | null;
  color: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Reminder for an event or todo */
export interface Reminder {
  id: string;
  event_id: string | null;
  todo_id: string | null;
  offset_minutes: number;
  created_at: string;
}

/** Per-user application settings */
export interface UserSettings {
  id: string;
  user_id: string;
  default_view: 'day' | 'week' | 'month' | 'agenda';
  week_start_day: 'monday' | 'sunday';
  default_reminder_offsets: number[];
  default_event_duration: number; // in minutes
  theme: 'light' | 'dark' | 'system';
  updated_at: string;
}

/** Unified widget item for displaying events and todos in lists/widgets */
export interface WidgetItem {
  id: string;
  type: 'event' | 'todo';
  title: string;
  timeText: string;
  color: string;
  isCompleted: boolean;
}
