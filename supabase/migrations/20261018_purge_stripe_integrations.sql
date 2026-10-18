-- Purge stored Stripe integration credentials.
--
-- The Stripe integration was removed from the codebase (2026-10-18).
-- No application code reads these rows anymore; deleting them removes
-- the leftover OAuth tokens / encrypted API keys from the database.
--
-- Apply manually to the live Supabase project (staging + production).
-- Idempotent — safe to re-run.

DELETE FROM integrations WHERE tool = 'stripe';
DELETE FROM fo_integrations WHERE tool = 'stripe';
