-- ============================================================
-- 001_initial_schema.sql
-- Initial database schema for Calendar/Todo Management System
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Tables
-- ============================================================

-- Note: auth.users is managed by Supabase Auth. We reference it via FK.

-- profiles: optional display_name for users
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- calendars
CREATE TABLE IF NOT EXISTS calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  sort_order int DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_calendars_user_id ON calendars(user_id);

-- recurrence_rules
CREATE TABLE IF NOT EXISTS recurrence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rrule_string text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_recurrence_rules_user_id ON recurrence_rules(user_id);

-- events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  location text DEFAULT '' NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_all_day boolean DEFAULT false NOT NULL,
  color text,
  recurrence_rule_id uuid REFERENCES recurrence_rules(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_calendar_id ON events(calendar_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_end_time ON events(end_time);

-- event_exceptions
CREATE TABLE IF NOT EXISTS event_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  original_date date NOT NULL,
  action text NOT NULL CHECK (action IN ('skip', 'modify')),
  modified_title text,
  modified_start_time timestamptz,
  modified_end_time timestamptz,
  modified_location text,
  modified_description text,
  modified_color text,
  modified_calendar_id uuid REFERENCES calendars(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_event_exceptions_user_id ON event_exceptions(user_id);
CREATE INDEX idx_event_exceptions_event_id ON event_exceptions(event_id);

-- todos
CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id uuid NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  due_date date,
  due_time time,
  is_completed boolean DEFAULT false NOT NULL,
  completed_at timestamptz,
  color text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_calendar_id ON todos(calendar_id);
CREATE INDEX idx_todos_due_date ON todos(due_date);

-- reminders
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  todo_id uuid REFERENCES todos(id) ON DELETE CASCADE,
  offset_minutes int NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  -- event_id and todo_id are mutually exclusive
  CONSTRAINT reminders_check_exclusive CHECK (
    (event_id IS NOT NULL AND todo_id IS NULL) OR
    (event_id IS NULL AND todo_id IS NOT NULL)
  )
);

CREATE INDEX idx_reminders_event_id ON reminders(event_id);
CREATE INDEX idx_reminders_todo_id ON reminders(todo_id);

-- user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  default_view text DEFAULT 'week' NOT NULL CHECK (default_view IN ('day', 'week', 'month', 'agenda')),
  week_start_day text DEFAULT 'monday' NOT NULL CHECK (week_start_day IN ('monday', 'sunday')),
  default_reminder_offsets jsonb DEFAULT '[10, 1440]'::jsonb NOT NULL,
  default_event_duration int DEFAULT 60 NOT NULL,
  theme text DEFAULT 'system' NOT NULL CHECK (theme IN ('light', 'dark', 'system')),
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- ============================================================
-- Row-Level Security (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- profiles: users can only access their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (id = auth.uid());

-- calendars: users can only access their own calendars
CREATE POLICY "calendars_select_own" ON calendars
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "calendars_insert_own" ON calendars
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "calendars_update_own" ON calendars
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "calendars_delete_own" ON calendars
  FOR DELETE USING (user_id = auth.uid());

-- recurrence_rules: users can only access their own rules
CREATE POLICY "recurrence_rules_select_own" ON recurrence_rules
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "recurrence_rules_insert_own" ON recurrence_rules
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "recurrence_rules_update_own" ON recurrence_rules
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "recurrence_rules_delete_own" ON recurrence_rules
  FOR DELETE USING (user_id = auth.uid());

-- events: users can only access their own events
CREATE POLICY "events_select_own" ON events
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "events_insert_own" ON events
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "events_update_own" ON events
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "events_delete_own" ON events
  FOR DELETE USING (user_id = auth.uid());

-- event_exceptions: users can only access their own exceptions
CREATE POLICY "event_exceptions_select_own" ON event_exceptions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "event_exceptions_insert_own" ON event_exceptions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "event_exceptions_update_own" ON event_exceptions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "event_exceptions_delete_own" ON event_exceptions
  FOR DELETE USING (user_id = auth.uid());

-- todos: users can only access their own todos
CREATE POLICY "todos_select_own" ON todos
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "todos_insert_own" ON todos
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "todos_update_own" ON todos
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "todos_delete_own" ON todos
  FOR DELETE USING (user_id = auth.uid());

-- reminders: users can only access reminders linked to their events/todos
-- We join through events or todos to check ownership
CREATE POLICY "reminders_select_own" ON reminders
  FOR SELECT USING (
    (event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM events WHERE events.id = reminders.event_id AND events.user_id = auth.uid()
    ))
    OR
    (todo_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM todos WHERE todos.id = reminders.todo_id AND todos.user_id = auth.uid()
    ))
  );
CREATE POLICY "reminders_insert_own" ON reminders
  FOR INSERT WITH CHECK (
    (event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM events WHERE events.id = reminders.event_id AND events.user_id = auth.uid()
    ))
    OR
    (todo_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM todos WHERE todos.id = reminders.todo_id AND todos.user_id = auth.uid()
    ))
  );
CREATE POLICY "reminders_update_own" ON reminders
  FOR UPDATE USING (
    (event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM events WHERE events.id = reminders.event_id AND events.user_id = auth.uid()
    ))
    OR
    (todo_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM todos WHERE todos.id = reminders.todo_id AND todos.user_id = auth.uid()
    ))
  );
CREATE POLICY "reminders_delete_own" ON reminders
  FOR DELETE USING (
    (event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM events WHERE events.id = reminders.event_id AND events.user_id = auth.uid()
    ))
    OR
    (todo_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM todos WHERE todos.id = reminders.todo_id AND todos.user_id = auth.uid()
    ))
  );

-- user_settings: users can only access their own settings
CREATE POLICY "user_settings_select_own" ON user_settings
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_settings_insert_own" ON user_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_settings_update_own" ON user_settings
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_settings_delete_own" ON user_settings
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- Triggers: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_calendars
  BEFORE UPDATE ON calendars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_events
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_event_exceptions
  BEFORE UPDATE ON event_exceptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_todos
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_user_settings
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Trigger: on new user registration, create default data
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create a profile record
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));

  -- Create a default calendar
  INSERT INTO calendars (user_id, name, color, is_default)
  VALUES (NEW.id, '个人', '#1a73e8', true);

  -- Create default user settings
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This trigger fires after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
