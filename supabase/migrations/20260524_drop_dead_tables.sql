-- Drop the 10 dead tables from CP-15 (chatv2 sever), CP-16 (audit takedown),
-- and CP-17 (pgvector RAG → Agent Skills migration). See respective docs
-- in docs/strategy/ for the architectural decisions.

-- CP-16: audit funnel takedown
drop table if exists public.audit_events cascade;
drop table if exists public.audit_sessions cascade;
drop table if exists public.audits cascade;
drop table if exists public.research_cache cascade;
drop table if exists public.build_requests cascade;
drop table if exists public.quick_win_onboarding_requests cascade;
drop table if exists public.agency_submissions cascade;

-- CP-15: chatv2/n8n sever
drop table if exists public.client_n8n_config cascade;

-- CP-17: pgvector RAG → Agent Skills (file-based)
-- CASCADE drops the match_kb_embeddings function automatically.
drop table if exists public.kb_embeddings cascade;
drop table if exists public.coo_kb_gaps cascade;
