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
      agency_submissions: {
        Row: {
          active_clients: number | null
          agency_type: string
          audit_id: string | null
          automation_wish: string
          created_at: string
          id: string
          revenue: string | null
          team_size: number | null
          website_url: string | null
        }
        Insert: {
          active_clients?: number | null
          agency_type: string
          audit_id?: string | null
          automation_wish: string
          created_at?: string
          id?: string
          revenue?: string | null
          team_size?: number | null
          website_url?: string | null
        }
        Update: {
          active_clients?: number | null
          agency_type?: string
          audit_id?: string | null
          automation_wish?: string
          created_at?: string
          id?: string
          revenue?: string | null
          team_size?: number | null
          website_url?: string | null
        }
        Relationships: []
      }
      agent_actions: {
        Row: {
          action_type: string
          approved_at: string | null
          created_at: string
          executed_at: string | null
          id: string
          payload: Json
          status: string
          undo_deadline: string | null
          undone_at: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          approved_at?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          payload?: Json
          status?: string
          undo_deadline?: string | null
          undone_at?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          approved_at?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          payload?: Json
          status?: string
          undo_deadline?: string | null
          undone_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          audit_id: string | null
          created_at: string | null
          event_name: string
          id: string
          metadata: Json | null
          report_stage: string | null
          section_id: string | null
          session_id: string | null
          source: string | null
          step: number | null
        }
        Insert: {
          audit_id?: string | null
          created_at?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          report_stage?: string | null
          section_id?: string | null
          session_id?: string | null
          source?: string | null
          step?: number | null
        }
        Update: {
          audit_id?: string | null
          created_at?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          report_stage?: string | null
          section_id?: string | null
          session_id?: string | null
          source?: string | null
          step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_sessions: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          step_reached: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          step_reached?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          step_reached?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      audits: {
        Row: {
          access_token: string | null
          answers: Json
          company: string
          created_at: string | null
          email: string
          follow_up_1_sent: boolean | null
          follow_up_2_sent: boolean | null
          follow_up_3_sent: boolean | null
          id: string
          name: string
          result: Json
          share_expires_at: string | null
          share_token: string | null
          unsubscribe_token: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          access_token?: string | null
          answers: Json
          company: string
          created_at?: string | null
          email: string
          follow_up_1_sent?: boolean | null
          follow_up_2_sent?: boolean | null
          follow_up_3_sent?: boolean | null
          id?: string
          name: string
          result: Json
          share_expires_at?: string | null
          share_token?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          access_token?: string | null
          answers?: Json
          company?: string
          created_at?: string | null
          email?: string
          follow_up_1_sent?: boolean | null
          follow_up_2_sent?: boolean | null
          follow_up_3_sent?: boolean | null
          id?: string
          name?: string
          result?: Json
          share_expires_at?: string | null
          share_token?: string | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: []
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
      build_requests: {
        Row: {
          audit_id: string | null
          automation_title: string
          budget: string
          created_at: string | null
          email: string
          id: string
          name: string
          notes: string | null
          timeline: string
        }
        Insert: {
          audit_id?: string | null
          automation_title: string
          budget: string
          created_at?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          timeline: string
        }
        Update: {
          audit_id?: string | null
          automation_title?: string
          budget?: string
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          timeline?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_requests_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          messages: Json
          updated_at: string | null
          visitor_email: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json
          updated_at?: string | null
          visitor_email?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json
          updated_at?: string | null
          visitor_email?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      client_n8n_config: {
        Row: {
          backfill_completed_at: string | null
          chatv2_project_id: string | null
          client_id: string
          created_at: string
          n8n_api_key: string | null
          n8n_base_url: string
          n8n_webhook_secret: string
          updated_at: string
        }
        Insert: {
          backfill_completed_at?: string | null
          chatv2_project_id?: string | null
          client_id: string
          created_at?: string
          n8n_api_key?: string | null
          n8n_base_url: string
          n8n_webhook_secret: string
          updated_at?: string
        }
        Update: {
          backfill_completed_at?: string | null
          chatv2_project_id?: string | null
          client_id?: string
          created_at?: string
          n8n_api_key?: string | null
          n8n_base_url?: string
          n8n_webhook_secret?: string
          updated_at?: string
        }
        Relationships: []
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
      quick_win_onboarding_requests: {
        Row: {
          created_at: string | null
          email: string
          goal: string
          id: string
          primary_tool: string
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          goal: string
          id?: string
          primary_tool: string
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          goal?: string
          id?: string
          primary_tool?: string
          source?: string | null
        }
        Relationships: []
      }
      research_cache: {
        Row: {
          expires_at: string
          fetched_at: string
          research_data: Json
          url: string
        }
        Insert: {
          expires_at: string
          fetched_at?: string
          research_data: Json
          url: string
        }
        Update: {
          expires_at?: string
          fetched_at?: string
          research_data?: Json
          url?: string
        }
        Relationships: []
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
      [_ in never]: never
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
