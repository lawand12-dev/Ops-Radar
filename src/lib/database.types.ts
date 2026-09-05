export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      action_tracking: {
        Row: {
          agent_action_id: string | null
          agent_slug: string
          baseline_state: Json
          created_at: string
          current_state: Json | null
          entity_id: string
          entity_tool_slug: string
          entity_type: string
          expected_outcome: string | null
          id: string
          last_checked_at: string | null
          outcome_detected: boolean
          outcome_detected_at: string | null
          outcome_value_usd: number | null
          user_id: string
        }
        Insert: {
          agent_action_id?: string | null
          agent_slug: string
          baseline_state?: Json
          created_at?: string
          current_state?: Json | null
          entity_id: string
          entity_tool_slug: string
          entity_type: string
          expected_outcome?: string | null
          id?: string
          last_checked_at?: string | null
          outcome_detected?: boolean
          outcome_detected_at?: string | null
          outcome_value_usd?: number | null
          user_id: string
        }
        Update: {
          agent_action_id?: string | null
          agent_slug?: string
          baseline_state?: Json
          created_at?: string
          current_state?: Json | null
          entity_id?: string
          entity_tool_slug?: string
          entity_type?: string
          expected_outcome?: string | null
          id?: string
          last_checked_at?: string | null
          outcome_detected?: boolean
          outcome_detected_at?: string | null
          outcome_value_usd?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_tracking_agent_action_id_fkey"
            columns: ["agent_action_id"]
            isOneToOne: false
            referencedRelation: "agent_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_actions: {
        Row: {
          action_type: string
          agent_slug: string | null
          approved_at: string | null
          created_at: string
          edit_diff: string | null
          edited_at: string | null
          executed_at: string | null
          feedback_reason: string | null
          id: string
          payload: Json
          rejected_at: string | null
          status: string
          undo_deadline: string | null
          undone_at: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          agent_slug?: string | null
          approved_at?: string | null
          created_at?: string
          edit_diff?: string | null
          edited_at?: string | null
          executed_at?: string | null
          feedback_reason?: string | null
          id?: string
          payload?: Json
          rejected_at?: string | null
          status?: string
          undo_deadline?: string | null
          undone_at?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          agent_slug?: string | null
          approved_at?: string | null
          created_at?: string
          edit_diff?: string | null
          edited_at?: string | null
          executed_at?: string | null
          feedback_reason?: string | null
          id?: string
          payload?: Json
          rejected_at?: string | null
          status?: string
          undo_deadline?: string | null
          undone_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_config: {
        Row: {
          agent_slug: string
          created_at: string
          custom_config: Json
          is_enabled: boolean
          last_run_at: string | null
          last_run_status: string | null
          user_id: string
        }
        Insert: {
          agent_slug: string
          created_at?: string
          custom_config?: Json
          is_enabled?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          user_id: string
        }
        Update: {
          agent_slug?: string
          created_at?: string
          custom_config?: Json
          is_enabled?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          actions_taken: number
          agent_slug: string
          cost_cents: number | null
          ended_at: string | null
          error_message: string | null
          id: string
          notion_writes: number
          patterns_detected: number
          risks_flagged: number
          started_at: string
          status: string
          summary: string | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          actions_taken?: number
          agent_slug: string
          cost_cents?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          notion_writes?: number
          patterns_detected?: number
          risks_flagged?: number
          started_at?: string
          status?: string
          summary?: string | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          actions_taken?: number
          agent_slug?: string
          cost_cents?: number | null
          ended_at?: string | null
          error_message?: string | null
          id?: string
          notion_writes?: number
          patterns_detected?: number
          risks_flagged?: number
          started_at?: string
          status?: string
          summary?: string | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      alert_notifications: {
        Row: {
          alert_kind: string
          email_sent_at: string | null
          entity_name: string
          id: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          alert_kind: string
          email_sent_at?: string | null
          entity_name: string
          id?: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          alert_kind?: string
          email_sent_at?: string | null
          entity_name?: string
          id?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_event_idempotency: {
        Row: {
          automation_ids: string[]
          received_at: string
          webhook_id: string
        }
        Insert: {
          automation_ids: string[]
          received_at?: string
          webhook_id: string
        }
        Update: {
          automation_ids?: string[]
          received_at?: string
          webhook_id?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          automation_id: string
          error: string | null
          finished_at: string | null
          id: string
          queued_action_ids: string[]
          result: Json | null
          started_at: string
          status: string
          steps: Json
          trigger_event: Json
          user_id: string
        }
        Insert: {
          automation_id: string
          error?: string | null
          finished_at?: string | null
          id?: string
          queued_action_ids?: string[]
          result?: Json | null
          started_at?: string
          status?: string
          steps?: Json
          trigger_event: Json
          user_id: string
        }
        Update: {
          automation_id?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          queued_action_ids?: string[]
          result?: Json | null
          started_at?: string
          status?: string
          steps?: Json
          trigger_event?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "customer_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_trigger_instances: {
        Row: {
          automation_id: string
          trigger_id: string
          connected_account_id: string
          created_at: string
          id: string
          is_active: boolean
          trigger_slug: string
          user_id: string
        }
        Insert: {
          automation_id: string
          trigger_id: string
          connected_account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          trigger_slug: string
          user_id: string
        }
        Update: {
          automation_id?: string
          trigger_id?: string
          connected_account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          trigger_slug?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_trigger_instances_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "customer_automations"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmarks: {
        Row: {
          computed_at: string
          id: string
          metric: string
          p25: number
          p50: number
          p75: number
          sample_size: number
          service_mix_bucket: string
          team_size_bucket: string
        }
        Insert: {
          computed_at?: string
          id?: string
          metric: string
          p25: number
          p50: number
          p75: number
          sample_size: number
          service_mix_bucket?: string
          team_size_bucket: string
        }
        Update: {
          computed_at?: string
          id?: string
          metric?: string
          p25?: number
          p50?: number
          p75?: number
          sample_size?: number
          service_mix_bucket?: string
          team_size_bucket?: string
        }
        Relationships: []
      }
      brain_commits: {
        Row: {
          agent_run_id: string | null
          author_type: string
          created_at: string
          id: string
          message: string | null
          user_id: string
        }
        Insert: {
          agent_run_id?: string | null
          author_type: string
          created_at?: string
          id?: string
          message?: string | null
          user_id: string
        }
        Update: {
          agent_run_id?: string | null
          author_type?: string
          created_at?: string
          id?: string
          message?: string | null
          user_id?: string
        }
        Relationships: []
      }
      brain_document_versions: {
        Row: {
          commit_id: string
          content: string
          content_hash: string
          content_size: number
          created_at: string
          document_id: string
          embedding: string | null
          embedding_model: string | null
          id: string
          path: string
          user_id: string
        }
        Insert: {
          commit_id: string
          content: string
          content_hash: string
          content_size: number
          created_at?: string
          document_id: string
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          path: string
          user_id: string
        }
        Update: {
          commit_id?: string
          content?: string
          content_hash?: string
          content_size?: number
          created_at?: string
          document_id?: string
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_document_versions_commit_id_fkey"
            columns: ["commit_id"]
            isOneToOne: false
            referencedRelation: "brain_commits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_document_versions_document_fk"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "brain_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_documents: {
        Row: {
          created_at: string
          current_version_id: string | null
          id: string
          path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_version_id?: string | null
          id?: string
          path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_version_id?: string | null
          id?: string
          path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_documents_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "brain_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      breadcrumbs: {
        Row: {
          consent_verified: boolean
          created_at: string
          embedding: string | null
          id: string
          occurred_at: string
          participants: string[] | null
          source_id: string | null
          source_ref: string | null
          source_type: string
          summary: string
          tags: string[] | null
          user_id: string
        }
        Insert: {
          consent_verified?: boolean
          created_at?: string
          embedding?: string | null
          id?: string
          occurred_at: string
          participants?: string[] | null
          source_id?: string | null
          source_ref?: string | null
          source_type: string
          summary: string
          tags?: string[] | null
          user_id: string
        }
        Update: {
          consent_verified?: boolean
          created_at?: string
          embedding?: string | null
          id?: string
          occurred_at?: string
          participants?: string[] | null
          source_id?: string | null
          source_ref?: string | null
          source_type?: string
          summary?: string
          tags?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breadcrumbs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "ingestion_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      briefings: {
        Row: {
          attention: Json | null
          created_at: string
          email_sent: boolean
          health_score: number | null
          id: string
          kind: string
          read_at: string | null
          recommendation: string | null
          user_id: string
          win: string | null
        }
        Insert: {
          attention?: Json | null
          created_at?: string
          email_sent?: boolean
          health_score?: number | null
          id?: string
          kind?: string
          read_at?: string | null
          recommendation?: string | null
          user_id: string
          win?: string | null
        }
        Update: {
          attention?: Json | null
          created_at?: string
          email_sent?: boolean
          health_score?: number | null
          id?: string
          kind?: string
          read_at?: string | null
          recommendation?: string | null
          user_id?: string
          win?: string | null
        }
        Relationships: []
      }
      composio_connections: {
        Row: {
          connection_id: string
          connected_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          metadata: Json
          tool_slug: string
          user_id: string
        }
        Insert: {
          connection_id: string
          connected_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          metadata?: Json
          tool_slug: string
          user_id: string
        }
        Update: {
          connection_id?: string
          connected_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          metadata?: Json
          tool_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      coo_chat_messages: {
        Row: {
          action_card: Json | null
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          tool_steps: Json | null
          user_id: string
        }
        Insert: {
          action_card?: Json | null
          content?: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          tool_steps?: Json | null
          user_id: string
        }
        Update: {
          action_card?: Json | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          tool_steps?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coo_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coo_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coo_chat_sessions: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          message_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coo_outcomes: {
        Row: {
          action_id: string
          action_type: string
          created_at: string
          decided_at: string
          decision: string
          id: number
          outcome_summary: string | null
          outcome_value_usd: number | null
          owner_reasoning: string | null
          user_id: string
        }
        Insert: {
          action_id: string
          action_type: string
          created_at?: string
          decided_at?: string
          decision: string
          id?: number
          outcome_summary?: string | null
          outcome_value_usd?: number | null
          owner_reasoning?: string | null
          user_id: string
        }
        Update: {
          action_id?: string
          action_type?: string
          created_at?: string
          decided_at?: string
          decision?: string
          id?: number
          outcome_summary?: string | null
          outcome_value_usd?: number | null
          owner_reasoning?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coo_outcomes_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "agent_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          channel: string
          created_at: string
          direction: string
          full_content: string | null
          id: string
          my_response: string | null
          occurred_at: string
          prospect_id: string
          response_at: string | null
          sentiment: string | null
          signals: string[] | null
          summary: string
        }
        Insert: {
          channel: string
          created_at?: string
          direction: string
          full_content?: string | null
          id?: string
          my_response?: string | null
          occurred_at?: string
          prospect_id: string
          response_at?: string | null
          sentiment?: string | null
          signals?: string[] | null
          summary: string
        }
        Update: {
          channel?: string
          created_at?: string
          direction?: string
          full_content?: string | null
          id?: string
          my_response?: string | null
          occurred_at?: string
          prospect_id?: string
          response_at?: string | null
          sentiment?: string | null
          signals?: string[] | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "crm_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interactions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "v_research_ready"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_prospects: {
        Row: {
          actual_close_date: string | null
          actual_deal_value: number | null
          archived: boolean
          audit_id: string | null
          company_name: string | null
          company_url: string | null
          created_at: string
          display_name: string
          email: string | null
          estimated_deal_value: number | null
          first_source: string
          first_source_detail: string | null
          full_name: string | null
          handle: string | null
          id: string
          location: string | null
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          objections: string[] | null
          predicted_close_date: string | null
          primary_pain: string | null
          segment: string | null
          stage: string
          stage_changed_at: string
          tags: string[] | null
          team_size: string | null
          tool_stack: string[] | null
          updated_at: string
        }
        Insert: {
          actual_close_date?: string | null
          actual_deal_value?: number | null
          archived?: boolean
          audit_id?: string | null
          company_name?: string | null
          company_url?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          estimated_deal_value?: number | null
          first_source: string
          first_source_detail?: string | null
          full_name?: string | null
          handle?: string | null
          id?: string
          location?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          objections?: string[] | null
          predicted_close_date?: string | null
          primary_pain?: string | null
          segment?: string | null
          stage?: string
          stage_changed_at?: string
          tags?: string[] | null
          team_size?: string | null
          tool_stack?: string[] | null
          updated_at?: string
        }
        Update: {
          actual_close_date?: string | null
          actual_deal_value?: number | null
          archived?: boolean
          audit_id?: string | null
          company_name?: string | null
          company_url?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          estimated_deal_value?: number | null
          first_source?: string
          first_source_detail?: string | null
          full_name?: string | null
          handle?: string | null
          id?: string
          location?: string | null
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          objections?: string[] | null
          predicted_close_date?: string | null
          primary_pain?: string | null
          segment?: string | null
          stage?: string
          stage_changed_at?: string
          tags?: string[] | null
          team_size?: string | null
          tool_stack?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_employee_chat_threads: {
        Row: {
          created_at: string
          employee_id: string | null
          employee_slug: string
          id: string
          last_message_at: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          employee_slug: string
          id?: string
          last_message_at?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          employee_slug?: string
          id?: string
          last_message_at?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_employee_chat_threads_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "custom_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_employee_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          tool_calls: Json | null
          tool_results: Json | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          tool_calls?: Json | null
          tool_results?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          tool_calls?: Json | null
          tool_results?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_employee_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "custom_employee_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_employees: {
        Row: {
          autonomy: string
          avatar_url: string | null
          created_at: string
          emoji: string | null
          id: string
          last_run_at: string | null
          max_steps: number | null
          model_slug: string | null
          name: string
          parent_employee_id: string | null
          persona_summary: string | null
          role: string
          schedule_cron: string | null
          scoped_brain_prefixes: string[]
          scoped_toolkits: string[]
          slug: string
          status: string
          system_prompt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          autonomy?: string
          avatar_url?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          last_run_at?: string | null
          max_steps?: number | null
          model_slug?: string | null
          name: string
          parent_employee_id?: string | null
          persona_summary?: string | null
          role: string
          schedule_cron?: string | null
          scoped_brain_prefixes?: string[]
          scoped_toolkits?: string[]
          slug: string
          status?: string
          system_prompt: string
          updated_at?: string
          user_id: string
        }
        Update: {
          autonomy?: string
          avatar_url?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          last_run_at?: string | null
          max_steps?: number | null
          model_slug?: string | null
          name?: string
          parent_employee_id?: string | null
          persona_summary?: string | null
          role?: string
          schedule_cron?: string | null
          scoped_brain_prefixes?: string[]
          scoped_toolkits?: string[]
          slug?: string
          status?: string
          system_prompt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_employees_parent_employee_id_fkey"
            columns: ["parent_employee_id"]
            isOneToOne: false
            referencedRelation: "custom_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_automations: {
        Row: {
          autonomy: string
          created_at: string
          created_by: string
          description: string
          id: string
          last_run_at: string | null
          last_run_status: string | null
          name: string
          run_count: number
          slug: string
          source: string
          source_session: string | null
          spec: Json
          spec_version: number
          status: string
          trigger_filter: Json
          trigger_kind: string
          trigger_slug: string | null
          trigger_toolkit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          autonomy?: string
          created_at?: string
          created_by?: string
          description: string
          id?: string
          last_run_at?: string | null
          last_run_status?: string | null
          name: string
          run_count?: number
          slug: string
          source?: string
          source_session?: string | null
          spec: Json
          spec_version?: number
          status?: string
          trigger_filter?: Json
          trigger_kind: string
          trigger_slug?: string | null
          trigger_toolkit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          autonomy?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          last_run_at?: string | null
          last_run_status?: string | null
          name?: string
          run_count?: number
          slug?: string
          source?: string
          source_session?: string | null
          spec?: Json
          spec_version?: number
          status?: string
          trigger_filter?: Json
          trigger_kind?: string
          trigger_slug?: string | null
          trigger_toolkit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      external_api_usage: {
        Row: {
          cost_estimate_cents: number | null
          credits_used: number
          id: string
          metadata: Json
          occurred_at: string
          operation: string
          provider: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          cost_estimate_cents?: number | null
          credits_used?: number
          id?: string
          metadata?: Json
          occurred_at?: string
          operation: string
          provider: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          cost_estimate_cents?: number | null
          credits_used?: number
          id?: string
          metadata?: Json
          occurred_at?: string
          operation?: string
          provider?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      external_events: {
        Row: {
          amount_cents: number | null
          client_external_id: string | null
          created_at: string
          event_type: string
          external_id: string
          id: string
          occurred_at: string
          payload: Json
          source: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          client_external_id?: string | null
          created_at?: string
          event_type: string
          external_id: string
          id?: string
          occurred_at: string
          payload: Json
          source: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          client_external_id?: string | null
          created_at?: string
          event_type?: string
          external_id?: string
          id?: string
          occurred_at?: string
          payload?: Json
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      fo_audit_log: {
        Row: {
          action_kind: string
          created_at: string
          details: Json
          fo_client_id: string | null
          fo_user_id: string
          id: string
        }
        Insert: {
          action_kind: string
          created_at?: string
          details?: Json
          fo_client_id?: string | null
          fo_user_id: string
          id?: string
        }
        Update: {
          action_kind?: string
          created_at?: string
          details?: Json
          fo_client_id?: string | null
          fo_user_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fo_audit_log_fo_client_id_fkey"
            columns: ["fo_client_id"]
            isOneToOne: false
            referencedRelation: "fo_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      fo_branding: {
        Row: {
          accent_color: string | null
          brand_name: string | null
          email_from_name: string | null
          fo_user_id: string
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          brand_name?: string | null
          email_from_name?: string | null
          fo_user_id: string
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          brand_name?: string | null
          email_from_name?: string | null
          fo_user_id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fo_clients: {
        Row: {
          agency_name: string
          created_at: string
          fo_user_id: string
          id: string
          notes: string | null
          team_size: string | null
        }
        Insert: {
          agency_name: string
          created_at?: string
          fo_user_id: string
          id?: string
          notes?: string | null
          team_size?: string | null
        }
        Update: {
          agency_name?: string
          created_at?: string
          fo_user_id?: string
          id?: string
          notes?: string | null
          team_size?: string | null
        }
        Relationships: []
      }
      fo_integrations: {
        Row: {
          auth_tag: string
          connected_at: string
          encrypted_token: string
          fo_client_id: string
          fo_user_id: string
          id: string
          iv: string
          status: string
          tool: string
        }
        Insert: {
          auth_tag: string
          connected_at?: string
          encrypted_token: string
          fo_client_id: string
          fo_user_id: string
          id?: string
          iv: string
          status?: string
          tool: string
        }
        Update: {
          auth_tag?: string
          connected_at?: string
          encrypted_token?: string
          fo_client_id?: string
          fo_user_id?: string
          id?: string
          iv?: string
          status?: string
          tool?: string
        }
        Relationships: [
          {
            foreignKeyName: "fo_integrations_fo_client_id_fkey"
            columns: ["fo_client_id"]
            isOneToOne: false
            referencedRelation: "fo_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hire_chat_messages: {
        Row: {
          content: string
          created_at: string
          draft_card: Json | null
          id: string
          role: string
          session_id: string
          tool_steps: Json | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          draft_card?: Json | null
          id?: string
          role: string
          session_id: string
          tool_steps?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          draft_card?: Json | null
          id?: string
          role?: string
          session_id?: string
          tool_steps?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hire_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "hire_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hire_chat_sessions: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          message_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ingestion_sources: {
        Row: {
          created_at: string
          cursor: Json | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          oauth_state: Json | null
          source_label: string | null
          source_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cursor?: Json | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          oauth_state?: Json | null
          source_label?: string | null
          source_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cursor?: Json | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          oauth_state?: Json | null
          source_label?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          auth_tag: string
          client_id: string
          connected_at: string
          encrypted_token: string
          external_account_id: string | null
          id: string
          iv: string
          last_error: string | null
          last_synced_at: string | null
          status: string
          tool: string
        }
        Insert: {
          auth_tag: string
          client_id: string
          connected_at?: string
          encrypted_token: string
          external_account_id?: string | null
          id?: string
          iv: string
          last_error?: string | null
          last_synced_at?: string | null
          status?: string
          tool: string
        }
        Update: {
          auth_tag?: string
          client_id?: string
          connected_at?: string
          encrypted_token?: string
          external_account_id?: string | null
          id?: string
          iv?: string
          last_error?: string | null
          last_synced_at?: string | null
          status?: string
          tool?: string
        }
        Relationships: []
      }
      kpi_snapshots: {
        Row: {
          created_at: string
          deals_won_mtd: number | null
          id: number
          invoiced_mtd_usd: number | null
          open_deals_count: number | null
          overdue_usd: number | null
          paid_mtd_usd: number | null
          pipeline_value_usd: number | null
          snapshot_date: string
          user_id: string
          utilization_pct: number | null
        }
        Insert: {
          created_at?: string
          deals_won_mtd?: number | null
          id?: number
          invoiced_mtd_usd?: number | null
          open_deals_count?: number | null
          overdue_usd?: number | null
          paid_mtd_usd?: number | null
          pipeline_value_usd?: number | null
          snapshot_date: string
          user_id: string
          utilization_pct?: number | null
        }
        Update: {
          created_at?: string
          deals_won_mtd?: number | null
          id?: number
          invoiced_mtd_usd?: number | null
          open_deals_count?: number | null
          overdue_usd?: number | null
          paid_mtd_usd?: number | null
          pipeline_value_usd?: number | null
          snapshot_date?: string
          user_id?: string
          utilization_pct?: number | null
        }
        Relationships: []
      }
      living_briefs: {
        Row: {
          brief_content: string
          generated_at: string
          id: string
          is_current: boolean
          model_used: string | null
          prompt_version: string | null
          user_id: string
          version: number
        }
        Insert: {
          brief_content: string
          generated_at?: string
          id?: string
          is_current?: boolean
          model_used?: string | null
          prompt_version?: string | null
          user_id: string
          version: number
        }
        Update: {
          brief_content?: string
          generated_at?: string
          id?: string
          is_current?: boolean
          model_used?: string | null
          prompt_version?: string | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      mcp_invocations: {
        Row: {
          args: Json | null
          caller: string | null
          created_at: string
          error_message: string | null
          id: number
          latency_ms: number | null
          result_status: string
          scope: string | null
          tool_name: string
          user_id: string | null
        }
        Insert: {
          args?: Json | null
          caller?: string | null
          created_at?: string
          error_message?: string | null
          id?: number
          latency_ms?: number | null
          result_status: string
          scope?: string | null
          tool_name: string
          user_id?: string | null
        }
        Update: {
          args?: Json | null
          caller?: string | null
          created_at?: string
          error_message?: string | null
          id?: number
          latency_ms?: number | null
          result_status?: string
          scope?: string | null
          tool_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notion_workspaces: {
        Row: {
          access_token_encrypted: string
          backfill_error: string | null
          backfill_status: string
          bot_id: string | null
          connected_at: string
          databases: Json
          last_synced_at: string | null
          parent_page_id: string
          user_id: string
          workspace_id: string
          workspace_name: string | null
        }
        Insert: {
          access_token_encrypted: string
          backfill_error?: string | null
          backfill_status?: string
          bot_id?: string | null
          connected_at?: string
          databases?: Json
          last_synced_at?: string | null
          parent_page_id: string
          user_id: string
          workspace_id: string
          workspace_name?: string | null
        }
        Update: {
          access_token_encrypted?: string
          backfill_error?: string | null
          backfill_status?: string
          bot_id?: string | null
          connected_at?: string
          databases?: Json
          last_synced_at?: string | null
          parent_page_id?: string
          user_id?: string
          workspace_id?: string
          workspace_name?: string | null
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          org_id: string
          role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          joined_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          joined_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
        }
        Relationships: []
      }
      outgoing_webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          signing_secret: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          signing_secret: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          signing_secret?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      pattern_cards: {
        Row: {
          confidence: number
          created_at: string
          description: string
          first_observed_at: string
          id: string
          is_active: boolean
          last_refreshed_at: string
          pattern_type: string
          source_breadcrumb_ids: string[]
          title: string
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          description: string
          first_observed_at: string
          id?: string
          is_active?: boolean
          last_refreshed_at?: string
          pattern_type: string
          source_breadcrumb_ids: string[]
          title: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          description?: string
          first_observed_at?: string
          id?: string
          is_active?: boolean
          last_refreshed_at?: string
          pattern_type?: string
          source_breadcrumb_ids?: string[]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      retainer_configs: {
        Row: {
          client_name_display: string
          client_name_norm: string
          created_at: string
          id: string
          included_hours: number
          monthly_amount_usd: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name_display: string
          client_name_norm: string
          created_at?: string
          id?: string
          included_hours?: number
          monthly_amount_usd?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name_display?: string
          client_name_norm?: string
          created_at?: string
          id?: string
          included_hours?: number
          monthly_amount_usd?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      score_snapshots: {
        Row: {
          company_name: string
          created_at: string | null
          id: string
          scores: Json
          share_token: string
          user_id: string
        }
        Insert: {
          company_name?: string
          created_at?: string | null
          id?: string
          scores: Json
          share_token?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          id?: string
          scores?: Json
          share_token?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_policies: {
        Row: {
          policy: string
          tool_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          policy?: string
          tool_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          policy?: string
          tool_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          user_id: string
          webhook_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          user_id: string
          webhook_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          user_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "outgoing_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_already_contacted: {
        Row: {
          company_name: string | null
          display_name: string | null
          email: string | null
          email_lc: string | null
          emails_sent: number | null
          last_sent_at: string | null
          stage: string | null
        }
        Relationships: []
      }
      v_research_ready: {
        Row: {
          company_name: string | null
          company_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string | null
          location: string | null
          notes: string | null
          segment: string | null
          tags: string[] | null
          team_size: string | null
          tier: string | null
        }
        Insert: {
          company_name?: string | null
          company_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          notes?: string | null
          segment?: string | null
          tags?: string[] | null
          team_size?: string | null
          tier?: never
        }
        Update: {
          company_name?: string | null
          company_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          location?: string | null
          notes?: string | null
          segment?: string | null
          tags?: string[] | null
          team_size?: string | null
          tier?: never
        }
        Relationships: []
      }
    }
    Functions: {
      match_brain_documents: {
        Args: {
          match_count?: number
          path_prefix?: string
          query_embedding: string
          target_user_id: string
        }
        Returns: {
          content: string
          path: string
          similarity: number
        }[]
      }
      match_breadcrumbs_for_user: {
        Args: {
          match_count?: number
          query_embedding: string
          target_user_id: string
        }
        Returns: {
          id: string
          occurred_at: string
          similarity: number
          source_type: string
          summary: string
          tags: string[]
        }[]
      }
      match_kb_embeddings: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          category: string
          content_preview: string
          similarity: number
          source_file: string
          summary: string
          title: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

