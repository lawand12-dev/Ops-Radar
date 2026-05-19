-- Multi-user seats / teams.
-- Powers pricing-page seat counts: 1 / 3 / 10 / 1.
-- Data model: existing customer-owned tables stay keyed on user_id = the OWNER's id.
-- Invited team members get an organization_members row pointing to the owner's org.
-- Their reads/writes go through getEffectiveUserId() (= owner.user_id) on the Next.js side.

CREATE TABLE IF NOT EXISTS organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  owner_user_id   uuid NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organizations_owner_idx ON organizations (owner_user_id);

CREATE TABLE IF NOT EXISTS organization_members (
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  role          text NOT NULL DEFAULT 'member',
  joined_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS organization_members_user_idx ON organization_members (user_id);

CREATE TABLE IF NOT EXISTS organization_invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'member',
  token           text NOT NULL UNIQUE,
  invited_by      uuid NOT NULL,
  expires_at      timestamptz NOT NULL,
  accepted_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organization_invitations_org_idx ON organization_invitations (org_id);
CREATE INDEX IF NOT EXISTS organization_invitations_token_idx ON organization_invitations (token);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read own org" ON organizations
  FOR SELECT
  USING (
    auth.uid() = owner_user_id
    OR EXISTS (SELECT 1 FROM organization_members om WHERE om.org_id = organizations.id AND om.user_id = auth.uid())
  );

CREATE POLICY "owner manages own org" ON organizations
  FOR UPDATE USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "members read own org members" ON organization_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM organization_members self WHERE self.org_id = organization_members.org_id AND self.user_id = auth.uid())
  );

CREATE POLICY "owner manages members" ON organization_members
  FOR ALL
  USING (EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_members.org_id AND o.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_members.org_id AND o.owner_user_id = auth.uid()));

CREATE POLICY "owner manages invitations" ON organization_invitations
  FOR ALL
  USING (EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_invitations.org_id AND o.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM organizations o WHERE o.id = organization_invitations.org_id AND o.owner_user_id = auth.uid()));

-- Backfill: auto-provision an organization for every existing user.
INSERT INTO organizations (name, owner_user_id)
SELECT
  COALESCE((raw_user_meta_data->>'company_name')::text, split_part(email, '@', 1) || ' org') AS name,
  id AS owner_user_id
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM organizations o WHERE o.owner_user_id = auth.users.id);

INSERT INTO organization_members (org_id, user_id, role)
SELECT o.id, o.owner_user_id, 'owner'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM organization_members m WHERE m.org_id = o.id AND m.user_id = o.owner_user_id);
