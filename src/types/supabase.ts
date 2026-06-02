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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      goal_attachments: {
        Row: {
          created_at: string | null
          file_type: string
          goal_id: string
          id: string
          name: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_type?: string
          goal_id: string
          id?: string
          name: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_type?: string
          goal_id?: string
          id?: string
          name?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_attachments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_members: {
        Row: {
          goal_id: string | null
          id: string
          joined_at: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          goal_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string | null
        }
        Update: {
          goal_id?: string | null
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_members_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          color: string | null
          created_at: string
          end_date: string | null
          id: string
          is_archived: boolean | null
          metadata: Json | null
          size: string | null
          start_date: string | null
          status: string
          sync_to_dashboard: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_archived?: boolean | null
          metadata?: Json | null
          size?: string | null
          start_date?: string | null
          status: string
          sync_to_dashboard?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_archived?: boolean | null
          metadata?: Json | null
          size?: string | null
          start_date?: string | null
          status?: string
          sync_to_dashboard?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cups_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_reports: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          is_read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          color: string | null
          content: string | null
          created_at: string | null
          font_settings: Json | null
          goal_id: string | null
          id: string
          is_locked: boolean | null
          is_on_home: boolean | null
          position_x: number | null
          position_y: number | null
          tag: string | null
          task_id: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          content?: string | null
          created_at?: string | null
          font_settings?: Json | null
          goal_id?: string | null
          id?: string
          is_locked?: boolean | null
          is_on_home?: boolean | null
          position_x?: number | null
          position_y?: number | null
          tag?: string | null
          task_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          content?: string | null
          created_at?: string | null
          font_settings?: Json | null
          goal_id?: string | null
          id?: string
          is_locked?: boolean | null
          is_on_home?: boolean | null
          position_x?: number | null
          position_y?: number | null
          tag?: string | null
          task_id?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_theme: string | null
          age: number | null
          ai_name: string | null
          ai_personality: string | null
          avatar_url: string | null
          blocked: boolean | null
          created_at: string | null
          custom_avatar: string | null
          daily_focus: string | null
          full_name: string | null
          gender: string | null
          id: string
          language: string | null
          last_seen: string | null
          mission_goal: string | null
          onboarded: boolean | null
          rank: string | null
          updated_at: string | null
          weekly_project: string | null
          xp: number | null
        }
        Insert: {
          active_theme?: string | null
          age?: number | null
          ai_name?: string | null
          ai_personality?: string | null
          avatar_url?: string | null
          blocked?: boolean | null
          created_at?: string | null
          custom_avatar?: string | null
          daily_focus?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          language?: string | null
          last_seen?: string | null
          mission_goal?: string | null
          onboarded?: boolean | null
          rank?: string | null
          updated_at?: string | null
          weekly_project?: string | null
          xp?: number | null
        }
        Update: {
          active_theme?: string | null
          age?: number | null
          ai_name?: string | null
          ai_personality?: string | null
          avatar_url?: string | null
          blocked?: boolean | null
          created_at?: string | null
          custom_avatar?: string | null
          daily_focus?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          language?: string | null
          last_seen?: string | null
          mission_goal?: string | null
          onboarded?: boolean | null
          rank?: string | null
          updated_at?: string | null
          weekly_project?: string | null
          xp?: number | null
        }
        Relationships: []
      }
      rank_up_logs: {
        Row: {
          id: string
          new_rank: string
          old_rank: string
          transitioned_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          new_rank: string
          old_rank: string
          transitioned_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          new_rank?: string
          old_rank?: string
          transitioned_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rank_up_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_join_requests: {
        Row: {
          goal_id: string | null
          id: string
          requested_at: string | null
          reviewed_at: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          goal_id?: string | null
          id?: string
          requested_at?: string | null
          reviewed_at?: string | null
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          goal_id?: string | null
          id?: string
          requested_at?: string | null
          reviewed_at?: string | null
          role?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squad_join_requests_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completion_log: {
        Row: {
          completed_at: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      task_progress: {
        Row: {
          task_id: string
          updated_at: string | null
          user_id: string
          video_duration: number | null
          video_time: number | null
        }
        Insert: {
          task_id: string
          updated_at?: string | null
          user_id: string
          video_duration?: number | null
          video_time?: number | null
        }
        Update: {
          task_id?: string
          updated_at?: string | null
          user_id?: string
          video_duration?: number | null
          video_time?: number | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          goal_id: string
          id: string
          is_completed: boolean
          metadata: Json | null
          original_title: string | null
          parent_id: string | null
          title: string
          type: string
          video_duration: number | null
          video_id: string | null
          video_progress: number | null
          video_url: string | null
          weight: number | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          goal_id: string
          id?: string
          is_completed?: boolean
          metadata?: Json | null
          original_title?: string | null
          parent_id?: string | null
          title: string
          type: string
          video_duration?: number | null
          video_id?: string | null
          video_progress?: number | null
          video_url?: string | null
          weight?: number | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string
          id?: string
          is_completed?: boolean
          metadata?: Json | null
          original_title?: string | null
          parent_id?: string | null
          title?: string
          type?: string
          video_duration?: number | null
          video_id?: string | null
          video_progress?: number | null
          video_url?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          goal_id: string
          id: string
          session_type: string | null
          started_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          goal_id: string
          id?: string
          session_type?: string | null
          started_at: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          goal_id?: string
          id?: string
          session_type?: string | null
          started_at?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_logs: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_goal_member: {
        Args: { goal_uuid: string; user_uuid: string }
        Returns: boolean
      }
      is_goal_owner: {
        Args: { goal_uuid: string; user_uuid: string }
        Returns: boolean
      }
      join_squad_by_invite: { Args: { input_code: string }; Returns: Json }
      purge_user_data: { Args: { target_user_id: string }; Returns: undefined }
      review_squad_join_request: {
        Args: { p_action: string; p_request_id: string }
        Returns: Json
      }
      submit_squad_join_request: { Args: { input_code: string }; Returns: Json }
      verify_squad_invite: { Args: { input_code: string }; Returns: Json }
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
