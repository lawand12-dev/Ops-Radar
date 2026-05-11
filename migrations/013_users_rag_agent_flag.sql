-- Permission flag for routing a user's chat through the platform RAG agent.
-- Defaults to 0 so existing users keep the regular Anthropic / fallback flow.
-- The agent endpoint + API key live in env (RAG_AGENT_URL / RAG_AGENT_API_KEY)
-- since the agent is a single platform-level resource, not per-user.

ALTER TABLE users
  ADD COLUMN can_use_rag_agent TINYINT(1) NOT NULL DEFAULT 0 AFTER anthropic_api_key_encrypted;
