-- CP-14 Day 4b: per-tool autonomy policy.
--
-- Customer can flip each connected toolkit between:
--   ask  — default; write actions queue for approval (current behavior)
--   auto — write actions execute immediately; still logged for audit
--   off  — write actions return an error to the model ("tool disabled")
--
-- Reads are always free regardless of policy (handled in approval-gate.ts).
-- One row per (user_id, tool_slug). Default is implicit 'ask' when no row.

CREATE TABLE IF NOT EXISTS public.tool_policies (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_slug  text        NOT NULL,
  policy     text        NOT NULL DEFAULT 'ask'
             CHECK (policy IN ('ask', 'auto', 'off')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tool_slug)
);

CREATE INDEX IF NOT EXISTS tool_policies_user_idx ON public.tool_policies (user_id);

ALTER TABLE public.tool_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY tool_policies_own_select ON public.tool_policies
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY tool_policies_own_insert ON public.tool_policies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY tool_policies_own_update ON public.tool_policies
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY tool_policies_own_delete ON public.tool_policies
  FOR DELETE USING (auth.uid() = user_id);
