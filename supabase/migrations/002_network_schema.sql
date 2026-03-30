-- Network Page Schema: groups, contacts, meetings

-- ============================================================
-- ENUM TYPE
-- ============================================================

CREATE TYPE network_section AS ENUM ('queue', 'waiting_on', 'scheduled');

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE network_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE network_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES network_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  section network_section NOT NULL DEFAULT 'queue',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE network_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  group_name text NOT NULL,
  group_id uuid NOT NULL REFERENCES network_groups(id) ON DELETE CASCADE,
  section_at_meeting network_section NOT NULL,
  met_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER network_groups_updated_at
  BEFORE UPDATE ON network_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER network_contacts_updated_at
  BEFORE UPDATE ON network_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE network_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_meetings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['network_groups', 'network_contacts', 'network_meetings'])
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
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE network_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE network_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE network_meetings;
