-- Agency submissions feedback loop
-- Stores qualifying audit inputs to enrich future audits with real-world context
-- Written by: knowledge-retrieval.ts (fetchSubmissionChunks) reads these rows
-- Written to: agency-submissions.ts (saveAuditSubmission) inserts qualifying rows

CREATE TABLE public.agency_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_type text NOT NULL,
  team_size integer,
  revenue text,
  active_clients integer,
  automation_wish text NOT NULL,
  website_url text,
  audit_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agency_submissions_type_idx
  ON public.agency_submissions (agency_type, created_at DESC);

ALTER TABLE public.agency_submissions ENABLE ROW LEVEL SECURITY;
