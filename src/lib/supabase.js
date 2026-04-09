"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
var supabase_js_1 = require("@supabase/supabase-js");
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl)
    console.error('[supabase] NEXT_PUBLIC_SUPABASE_URL is not set');
if (!supabaseAnonKey)
    console.error('[supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
// Table: audits
// CREATE TABLE audits (
//   id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   name       text NOT NULL,
//   email      text NOT NULL,
//   company    text NOT NULL,
//   answers    jsonb NOT NULL,
//   result     jsonb NOT NULL,
//   created_at timestamptz DEFAULT now()
// );
// Table: chat_conversations
// CREATE TABLE chat_conversations (
//   id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   visitor_id    text,                          -- localStorage UUID
//   messages      jsonb NOT NULL DEFAULT '[]',   -- [{role,content,timestamp}]
//   visitor_email text,
//   visitor_name  text,
//   created_at    timestamptz DEFAULT now(),
//   updated_at    timestamptz DEFAULT now()
// );
// CREATE INDEX IF NOT EXISTS idx_chat_conv_visitor ON chat_conversations(visitor_id);
//
// Migration (run in Supabase SQL editor if table already exists):
// ALTER TABLE chat_conversations
//   ADD COLUMN IF NOT EXISTS visitor_id   text,
//   ADD COLUMN IF NOT EXISTS visitor_name text,
//   ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();
// CREATE INDEX IF NOT EXISTS idx_chat_conv_visitor ON chat_conversations(visitor_id);
