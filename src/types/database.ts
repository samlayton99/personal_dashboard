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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      action_objective_links: {
        Row: {
          action_id: string
          objective_id: string
        }
        Insert: {
          action_id: string
          objective_id: string
        }
        Update: {
          action_id?: string
          objective_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_objective_links_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_objective_links_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      action_push_links: {
        Row: {
          action_id: string
          push_id: string
        }
        Insert: {
          action_id: string
          push_id: string
        }
        Update: {
          action_id?: string
          push_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_push_links_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_push_links_push_id_fkey"
            columns: ["push_id"]
            isOneToOne: false
            referencedRelation: "pushes"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          created_at: string
          date: string
          description: string
          id: string
          needle_score: number
          reflection_id: string
          status: Database["public"]["Enums"]["action_status"]
        }
        Insert: {
          created_at?: string
          date: string
          description: string
          id: string
          needle_score?: number
          reflection_id: string
          status?: Database["public"]["Enums"]["action_status"]
        }
        Update: {
          created_at?: string
          date?: string
          description?: string
          id?: string
          needle_score?: number
          reflection_id?: string
          status?: Database["public"]["Enums"]["action_status"]
        }
        Relationships: [
          {
            foreignKeyName: "actions_reflection_id_fkey"
            columns: ["reflection_id"]
            isOneToOne: false
            referencedRelation: "daily_reflections"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reflections: {
        Row: {
          covers_since: string
          created_at: string
          date: string
          id: string
          is_escape_hatch: boolean
          raw_text: string
        }
        Insert: {
          covers_since: string
          created_at?: string
          date: string
          id?: string
          is_escape_hatch?: boolean
          raw_text: string
        }
        Update: {
          covers_since?: string
          created_at?: string
          date?: string
          id?: string
          is_escape_hatch?: boolean
          raw_text?: string
        }
        Relationships: []
      }
      email_digests: {
        Row: {
          context: Database["public"]["Enums"]["email_context"]
          created_at: string
          entries: Json
          id: string
        }
        Insert: {
          context: Database["public"]["Enums"]["email_context"]
          created_at?: string
          entries?: Json
          id?: string
        }
        Update: {
          context?: Database["public"]["Enums"]["email_context"]
          created_at?: string
          entries?: Json
          id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          agent_name: string
          created_at: string
          event_type: string
          id: string
          payload: Json
          requires_approval: boolean
          status: Database["public"]["Enums"]["event_status"]
        }
        Insert: {
          agent_name: string
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          requires_approval?: boolean
          status?: Database["public"]["Enums"]["event_status"]
        }
        Update: {
          agent_name?: string
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          requires_approval?: boolean
          status?: Database["public"]["Enums"]["event_status"]
        }
        Relationships: []
      }
      objective_tags: {
        Row: {
          objective_id: string
          tag_id: number
        }
        Insert: {
          objective_id: string
          tag_id: number
        }
        Update: {
          objective_id?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "objective_tags_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objective_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          created_at: string
          current_priority: number
          description: string | null
          hypothesis: string | null
          id: string
          ideas: string | null
          name: string
          needle_movement: number
          other_notes: string | null
          progress_summary: string | null
          retirement_note: string | null
          sort_order: number
          status: Database["public"]["Enums"]["objective_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_priority?: number
          description?: string | null
          hypothesis?: string | null
          id: string
          ideas?: string | null
          name: string
          needle_movement?: number
          other_notes?: string | null
          progress_summary?: string | null
          retirement_note?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["objective_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_priority?: number
          description?: string | null
          hypothesis?: string | null
          id?: string
          ideas?: string | null
          name?: string
          needle_movement?: number
          other_notes?: string | null
          progress_summary?: string | null
          retirement_note?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["objective_status"]
          updated_at?: string
        }
        Relationships: []
      }
      push_objective_links: {
        Row: {
          objective_id: string
          push_id: string
        }
        Insert: {
          objective_id: string
          push_id: string
        }
        Update: {
          objective_id?: string
          push_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_objective_links_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_objective_links_push_id_fkey"
            columns: ["push_id"]
            isOneToOne: false
            referencedRelation: "pushes"
            referencedColumns: ["id"]
          },
        ]
      }
      pushes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          notes: string | null
          progress_summary: string | null
          retirement_note: string | null
          retirement_reason:
            | Database["public"]["Enums"]["retirement_reason"]
            | null
          sort_order: number
          status: Database["public"]["Enums"]["push_status"]
          todos_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          name: string
          notes?: string | null
          progress_summary?: string | null
          retirement_note?: string | null
          retirement_reason?:
            | Database["public"]["Enums"]["retirement_reason"]
            | null
          sort_order?: number
          status?: Database["public"]["Enums"]["push_status"]
          todos_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          progress_summary?: string | null
          retirement_note?: string | null
          retirement_reason?:
            | Database["public"]["Enums"]["retirement_reason"]
            | null
          sort_order?: number
          status?: Database["public"]["Enums"]["push_status"]
          todos_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      source_registry: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          source_type: Database["public"]["Enums"]["source_type"]
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          source_type: Database["public"]["Enums"]["source_type"]
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          source_type?: Database["public"]["Enums"]["source_type"]
          url?: string
        }
        Relationships: []
      }
      summaries: {
        Row: {
          content: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          type: Database["public"]["Enums"]["summary_type"]
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          type: Database["public"]["Enums"]["summary_type"]
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          type?: Database["public"]["Enums"]["summary_type"]
        }
        Relationships: []
      }
      system_state: {
        Row: {
          id: number
          is_locked: boolean
          last_reflection_date: string | null
          locked_at: string | null
        }
        Insert: {
          id: number
          is_locked?: boolean
          last_reflection_date?: string | null
          locked_at?: string | null
        }
        Update: {
          id?: number
          is_locked?: boolean
          last_reflection_date?: string | null
          locked_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          date_added: string
          date_completed: string | null
          description: string
          due_date: string | null
          id: string
          is_completed: boolean
          panel: Database["public"]["Enums"]["todo_panel"]
          priority: number
          push_id: string | null
          sort_order: number
          source: Database["public"]["Enums"]["todo_source"]
        }
        Insert: {
          date_added?: string
          date_completed?: string | null
          description: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          panel?: Database["public"]["Enums"]["todo_panel"]
          priority?: number
          push_id?: string | null
          sort_order?: number
          source?: Database["public"]["Enums"]["todo_source"]
        }
        Update: {
          date_added?: string
          date_completed?: string | null
          description?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          panel?: Database["public"]["Enums"]["todo_panel"]
          priority?: number
          push_id?: string | null
          sort_order?: number
          source?: Database["public"]["Enums"]["todo_source"]
        }
        Relationships: [
          {
            foreignKeyName: "todos_push_id_fkey"
            columns: ["push_id"]
            isOneToOne: false
            referencedRelation: "pushes"
            referencedColumns: ["id"]
          },
        ]
      }
      world_digests: {
        Row: {
          content: string
          created_at: string
          date: string
          directions: string | null
          estimated_read_minutes: number
          id: string
        }
        Insert: {
          content: string
          created_at?: string
          date: string
          directions?: string | null
          estimated_read_minutes: number
          id?: string
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          directions?: string | null
          estimated_read_minutes?: number
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      action_status: "pending" | "accepted" | "edited"
      email_context:
        | "church"
        | "prod"
        | "research"
        | "stanford"
        | "family"
        | "other"
      event_status: "executed" | "pending_approval" | "approved" | "rejected"
      objective_status: "active" | "inactive"
      push_status: "active" | "inactive"
      retirement_reason: "completed" | "failed" | "na"
      source_type: "x_account" | "rss" | "news_site" | "substack"
      summary_type: "weekly" | "monthly" | "quarterly" | "yearly"
      todo_panel: "now" | "in_progress" | "future"
      todo_source: "manual" | "agent" | "openclaw"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      action_status: ["pending", "accepted", "edited"],
      email_context: [
        "church",
        "prod",
        "research",
        "stanford",
        "family",
        "other",
      ],
      event_status: ["executed", "pending_approval", "approved", "rejected"],
      objective_status: ["active", "inactive"],
      push_status: ["active", "inactive"],
      retirement_reason: ["completed", "failed", "na"],
      source_type: ["x_account", "rss", "news_site", "substack"],
      summary_type: ["weekly", "monthly", "quarterly", "yearly"],
      todo_panel: ["now", "in_progress", "future"],
      todo_source: ["manual", "agent", "openclaw"],
    },
  },
} as const
