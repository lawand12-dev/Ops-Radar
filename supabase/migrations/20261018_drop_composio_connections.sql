-- Drop the legacy SaaS-broker connections table. A later OAuth broker
-- replaced it on 2026-05-26 (see docs/adr/0010) and nothing in the app
-- reads or writes this table anymore.
-- `cascade` also removes its indexes and RLS policy.
drop table if exists public.composio_connections cascade;
