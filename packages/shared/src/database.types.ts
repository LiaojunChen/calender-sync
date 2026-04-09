// ============================================================
// Supabase Database Type Definitions
// ============================================================
//
// Generated manually to match supabase/schema.sql.
// In production you would run `supabase gen types typescript` to
// auto-generate this file; this hand-written version keeps the
// project buildable without a running Supabase instance.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      calendars: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          is_visible: boolean;
          is_default: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          is_visible?: boolean;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          is_visible?: boolean;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recurrence_rules: {
        Row: {
          id: string;
          user_id: string;
          rrule_string: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          rrule_string: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rrule_string?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          calendar_id: string;
          title: string;
          description: string;
          location: string;
          start_time: string;
          end_time: string;
          is_all_day: boolean;
          color: string | null;
          recurrence_rule_id: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          calendar_id: string;
          title: string;
          description?: string;
          location?: string;
          start_time: string;
          end_time: string;
          is_all_day?: boolean;
          color?: string | null;
          recurrence_rule_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          calendar_id?: string;
          title?: string;
          description?: string;
          location?: string;
          start_time?: string;
          end_time?: string;
          is_all_day?: boolean;
          color?: string | null;
          recurrence_rule_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'events_calendar_id_fkey';
            columns: ['calendar_id'];
            isOneToOne: false;
            referencedRelation: 'calendars';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'events_recurrence_rule_id_fkey';
            columns: ['recurrence_rule_id'];
            isOneToOne: false;
            referencedRelation: 'recurrence_rules';
            referencedColumns: ['id'];
          },
        ];
      };
      event_exceptions: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          original_date: string;
          action: string;
          modified_title: string | null;
          modified_start_time: string | null;
          modified_end_time: string | null;
          modified_location: string | null;
          modified_description: string | null;
          modified_color: string | null;
          modified_calendar_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          original_date: string;
          action: string;
          modified_title?: string | null;
          modified_start_time?: string | null;
          modified_end_time?: string | null;
          modified_location?: string | null;
          modified_description?: string | null;
          modified_color?: string | null;
          modified_calendar_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          original_date?: string;
          action?: string;
          modified_title?: string | null;
          modified_start_time?: string | null;
          modified_end_time?: string | null;
          modified_location?: string | null;
          modified_description?: string | null;
          modified_color?: string | null;
          modified_calendar_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_exceptions_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'event_exceptions_modified_calendar_id_fkey';
            columns: ['modified_calendar_id'];
            isOneToOne: false;
            referencedRelation: 'calendars';
            referencedColumns: ['id'];
          },
        ];
      };
      todos: {
        Row: {
          id: string;
          user_id: string;
          calendar_id: string;
          title: string;
          description: string;
          due_date: string | null;
          due_time: string | null;
          is_completed: boolean;
          completed_at: string | null;
          color: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          calendar_id: string;
          title: string;
          description?: string;
          due_date?: string | null;
          due_time?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          color?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          calendar_id?: string;
          title?: string;
          description?: string;
          due_date?: string | null;
          due_time?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          color?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'todos_calendar_id_fkey';
            columns: ['calendar_id'];
            isOneToOne: false;
            referencedRelation: 'calendars';
            referencedColumns: ['id'];
          },
        ];
      };
      reminders: {
        Row: {
          id: string;
          event_id: string | null;
          todo_id: string | null;
          offset_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id?: string | null;
          todo_id?: string | null;
          offset_minutes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string | null;
          todo_id?: string | null;
          offset_minutes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminders_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reminders_todo_id_fkey';
            columns: ['todo_id'];
            isOneToOne: false;
            referencedRelation: 'todos';
            referencedColumns: ['id'];
          },
        ];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          default_view: string;
          week_start_day: string;
          default_reminder_offsets: Json;
          default_event_duration: number;
          theme: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          default_view?: string;
          week_start_day?: string;
          default_reminder_offsets?: Json;
          default_event_duration?: number;
          theme?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          default_view?: string;
          week_start_day?: string;
          default_reminder_offsets?: Json;
          default_event_duration?: number;
          theme?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
