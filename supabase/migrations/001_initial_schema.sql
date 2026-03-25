-- First Principles Dashboard: Initial Schema
-- All 16 tables, enums, RLS, triggers, and seed data.

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE objective_status AS ENUM ('active', 'inactive');
CREATE TYPE push_status AS ENUM ('active', 'inactive');
CREATE TYPE retirement_reason AS ENUM ('completed', 'failed', 'na');
CREATE TYPE todo_source AS ENUM ('manual', 'agent', 'openclaw');
CREATE TYPE todo_panel AS ENUM ('now', 'in_progress', 'future');
CREATE TYPE action_status AS ENUM ('pending', 'accepted', 'edited');
CREATE TYPE event_status AS ENUM ('executed', 'pending_approval', 'approved', 'rejected');
CREATE TYPE summary_type AS ENUM ('weekly', 'monthly', 'quarterly', 'yearly');
CREATE TYPE email_context AS ENUM ('church', 'prod', 'research', 'stanford', 'family', 'other');
CREATE TYPE source_type AS ENUM ('x_account', 'rss', 'news_site', 'substack');

-- ============================================================
-- INDEPENDENT TABLES (no foreign key dependencies)
-- ============================================================

CREATE TABLE objectives (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  ideas text,
  hypothesis text,
  other_notes text,
  status objective_status NOT NULL DEFAULT 'active',
  retirement_note text,
  progress_summary text,
  current_priority float NOT NULL DEFAULT 0,
  needle_movement float NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE pushes (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  todos_notes text,
  notes text,
  status push_status NOT NULL DEFAULT 'active',
  retirement_reason retirement_reason,
  retirement_note text,
  progress_summary text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE daily_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  raw_text text NOT NULL,
  is_escape_hatch boolean NOT NULL DEFAULT false,
  covers_since date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status event_status NOT NULL DEFAULT 'executed',
  requires_approval boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type summary_type NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE system_state (
  id integer PRIMARY KEY,
  is_locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  last_reflection_date date
);

CREATE TABLE source_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type source_type NOT NULL,
  url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE world_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  directions text,
  content text NOT NULL,
  estimated_read_minutes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  context email_context NOT NULL,
  entries jsonb NOT NULL DEFAULT '[]'
);

-- ============================================================
-- FK-DEPENDENT TABLES
-- ============================================================

CREATE TABLE objective_tags (
  objective_id text NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  tag_id integer NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (objective_id, tag_id)
);

CREATE TABLE push_objective_links (
  push_id text NOT NULL REFERENCES pushes(id) ON DELETE CASCADE,
  objective_id text NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  PRIMARY KEY (push_id, objective_id)
);

CREATE TABLE todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  push_id text REFERENCES pushes(id) ON DELETE SET NULL,
  source todo_source NOT NULL DEFAULT 'manual',
  priority float NOT NULL DEFAULT 5.0,
  panel todo_panel NOT NULL DEFAULT 'now',
  is_completed boolean NOT NULL DEFAULT false,
  due_date date,
  sort_order integer NOT NULL DEFAULT 0,
  date_added timestamptz NOT NULL DEFAULT now(),
  date_completed timestamptz
);

CREATE TABLE actions (
  id text PRIMARY KEY,
  reflection_id uuid NOT NULL REFERENCES daily_reflections(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text NOT NULL,
  needle_score integer NOT NULL DEFAULT 0,
  status action_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE action_push_links (
  action_id text NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  push_id text NOT NULL REFERENCES pushes(id) ON DELETE CASCADE,
  PRIMARY KEY (action_id, push_id)
);

CREATE TABLE action_objective_links (
  action_id text NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  objective_id text NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  PRIMARY KEY (action_id, objective_id)
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO system_state (id, is_locked, last_reflection_date) VALUES (1, false, NULL);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER objectives_updated_at
  BEFORE UPDATE ON objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pushes_updated_at
  BEFORE UPDATE ON pushes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Single-user system: any authenticated user has full access.
-- ============================================================

ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE objective_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pushes ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_objective_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_push_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_objective_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_digests ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users get full access to all tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'objectives', 'tags', 'objective_tags', 'pushes', 'push_objective_links',
      'todos', 'daily_reflections', 'actions', 'action_push_links',
      'action_objective_links', 'events', 'summaries', 'system_state',
      'source_registry', 'world_digests', 'email_digests'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Authenticated users have full access" ON %I FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)',
      tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- REALTIME
-- Enable realtime on tables that need live updates.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE system_state;
ALTER PUBLICATION supabase_realtime ADD TABLE todos;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
