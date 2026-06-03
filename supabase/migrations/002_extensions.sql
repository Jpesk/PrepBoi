-- =============================================================================
-- PrepPro — Database Schema Extensions (v0.1.0)
-- Custom PIN-Auth, Business Pet Gamification, Connecteam Chat, and Encrypted Logs
-- =============================================================================

-- 1. Extend profiles table with PIN login, Pet status, and achievements
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_code TEXT CHECK (pin_code ~ '^[0-9]{4}$');
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pet_status JSONB NOT NULL DEFAULT '{
  "name": "Companion",
  "level": 1,
  "exp": 0,
  "health": 100,
  "happiness": 100,
  "treats": 3,
  "accessories": []
}';

CREATE INDEX IF NOT EXISTS idx_profiles_pin ON profiles(pin_code);

-- 2. Extend organizations table with Pet theme, API configurations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS pet_theme TEXT NOT NULL DEFAULT 'generic'; -- 'doughboi' | 'bobamon' | 'slicemon' | 'generic'
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS api_provider TEXT NOT NULL DEFAULT 'mock'; -- 'anthropic' | 'openai' | 'ollama' | 'mock'
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS api_endpoint TEXT; -- for ollama local url (e.g. http://localhost:11434)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS log_decryption_hash TEXT; -- stores salt/hash to verify keyphrase locally

-- 3. Announcements Feed Table
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID        REFERENCES locations(id) ON DELETE CASCADE, -- null means all locations
  created_by  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_org ON announcements(org_id);
CREATE INDEX IF NOT EXISTS idx_announcements_location ON announcements(location_id);

-- Announcement Acknowledgements Table (tracking readership & engagement)
CREATE TABLE IF NOT EXISTS announcement_acknowledgements (
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, profile_id)
);

-- 4. Communication Hub (Direct and Group Chat)
CREATE TABLE IF NOT EXISTS chat_groups (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID        REFERENCES locations(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  created_by  UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_groups_org ON chat_groups(org_id);

CREATE TABLE IF NOT EXISTS chat_group_members (
  group_id   UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_profile ON chat_group_members(profile_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  group_id     UUID        REFERENCES chat_groups(id) ON DELETE CASCADE, -- null for 1-to-1 DMs
  sender_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID        REFERENCES profiles(id) ON DELETE CASCADE, -- null for group messages
  body         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_org ON chat_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_dm ON chat_messages(sender_id, recipient_id);

-- 5. Encrypted Manager Logbook Table
CREATE TABLE IF NOT EXISTS manager_logs (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id       UUID        REFERENCES locations(id) ON DELETE CASCADE,
  created_by        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift             TEXT        NOT NULL, -- 'AM', 'PM', 'Mid'
  encrypted_content TEXT        NOT NULL, -- Encrypted client-side ciphertext
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_logs_org ON manager_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_manager_logs_date ON manager_logs(created_at desc);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_logs ENABLE ROW LEVEL SECURITY;

-- ── Announcements ─────────────────────────────────────────────────────────────
CREATE POLICY "ann_read" ON announcements FOR SELECT
  USING (org_id = my_org_id() AND (location_id = my_location_id() OR location_id IS NULL));

CREATE POLICY "ann_write" ON announcements FOR ALL
  USING (org_id = my_org_id() AND is_leader_or_above());

-- ── Acknowledgements ─────────────────────────────────────────────────────────
CREATE POLICY "ack_read" ON announcement_acknowledgements FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE org_id = my_org_id()));

CREATE POLICY "ack_write" ON announcement_acknowledgements FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- ── Chat Groups ──────────────────────────────────────────────────────────────
CREATE POLICY "group_read" ON chat_groups FOR SELECT
  USING (org_id = my_org_id());

CREATE POLICY "group_write" ON chat_groups FOR ALL
  USING (org_id = my_org_id());

-- ── Chat Group Members ────────────────────────────────────────────────────────
CREATE POLICY "member_read" ON chat_group_members FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE org_id = my_org_id()));

CREATE POLICY "member_write" ON chat_group_members FOR ALL
  USING (profile_id = auth.uid() OR is_leader_or_above());

-- ── Chat Messages ────────────────────────────────────────────────────────────
CREATE POLICY "message_read" ON chat_messages FOR SELECT
  USING (
    org_id = my_org_id() AND (
      sender_id = auth.uid() OR
      recipient_id = auth.uid() OR
      group_id IN (SELECT group_id FROM chat_group_members WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "message_write" ON chat_messages FOR INSERT
  WITH CHECK (org_id = my_org_id() AND sender_id = auth.uid());

-- ── Manager Logs ──────────────────────────────────────────────────────────────
CREATE POLICY "log_all" ON manager_logs FOR ALL
  USING (org_id = my_org_id() AND is_leader_or_above());

-- =============================================================================
-- REALTIME REGISTRATION
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
