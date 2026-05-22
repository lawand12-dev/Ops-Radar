-- COO outcome memory: every action decision logged here.
-- Used by:
--   1. The COO chat system prompt — last-N outcomes injected as context
--      so the agent learns from past decisions ("you rejected raising
--      Client X's retainer last time because they're a referral source").
--   2. The actions evaluator — same context fed into the next nightly
--      evaluation cycle, so we don't propose actions the owner has
--      already rejected for the same reason.
--   3. ROI reporting — outcome_value_usd lets us show customers the
--      dollars OpsRadar recovered each month.
--
-- One row per action decision (approved / dismissed / undone).

CREATE TABLE IF NOT EXISTS coo_outcomes (
  id                  BIGSERIAL    PRIMARY KEY,
  action_id           UUID         NOT NULL REFERENCES agent_actions(id) ON DELETE CASCADE,
  user_id             UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type         TEXT         NOT NULL,
  decision            TEXT         NOT NULL CHECK (decision IN ('approved', 'dismissed', 'undone')),
  decided_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Populated later (e.g. by a follow-up job that measures outcome):
  outcome_summary     TEXT,
  outcome_value_usd   NUMERIC(12, 2),

  -- Optional reasoning the owner can attach (UI to capture this later).
  -- Today we don't ask — but capturing the column lets us add the prompt
  -- without another migration.
  owner_reasoning     TEXT,

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coo_outcomes_action_id_idx      ON coo_outcomes (action_id);
CREATE INDEX IF NOT EXISTS coo_outcomes_user_id_idx        ON coo_outcomes (user_id);
CREATE INDEX IF NOT EXISTS coo_outcomes_user_decided_idx   ON coo_outcomes (user_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS coo_outcomes_user_type_idx      ON coo_outcomes (user_id, action_type, decided_at DESC);

ALTER TABLE coo_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own outcomes"
  ON coo_outcomes FOR SELECT
  USING (auth.uid() = user_id);
