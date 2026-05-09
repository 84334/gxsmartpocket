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
      fixed_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          body: string
          created_at: string
          id: string
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allocation_allowance_pct: number
          allocation_backup_pct: number
          allocation_savings_pct: number
          created_at: string
          daily_spending_limit: number
          display_name: string | null
          id: string
          last_streak_date: string | null
          longest_streak: number
          monthly_income: number | null
          non_negotiables: string[] | null
          onboarded_at: string | null
          primary_transport: string | null
          streak_days: number
          streak_goal_days: number
          updated_at: string
        }
        Insert: {
          allocation_allowance_pct?: number
          allocation_backup_pct?: number
          allocation_savings_pct?: number
          created_at?: string
          daily_spending_limit?: number
          display_name?: string | null
          id: string
          last_streak_date?: string | null
          longest_streak?: number
          monthly_income?: number | null
          non_negotiables?: string[] | null
          onboarded_at?: string | null
          primary_transport?: string | null
          streak_days?: number
          streak_goal_days?: number
          updated_at?: string
        }
        Update: {
          allocation_allowance_pct?: number
          allocation_backup_pct?: number
          allocation_savings_pct?: number
          created_at?: string
          daily_spending_limit?: number
          display_name?: string | null
          id?: string
          last_streak_date?: string | null
          longest_streak?: number
          monthly_income?: number | null
          non_negotiables?: string[] | null
          onboarded_at?: string | null
          primary_transport?: string | null
          streak_days?: number
          streak_goal_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      receipt_items: {
        Row: {
          category: Database["public"]["Enums"]["spending_category"]
          created_at: string
          id: string
          is_essential: boolean
          name: string
          price: number
          quantity: number
          receipt_id: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["spending_category"]
          created_at?: string
          id?: string
          is_essential?: boolean
          name: string
          price?: number
          quantity?: number
          receipt_id: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["spending_category"]
          created_at?: string
          id?: string
          is_essential?: boolean
          name?: string
          price?: number
          quantity?: number
          receipt_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          image_url: string | null
          merchant: string | null
          purchased_at: string | null
          raw_text: string | null
          status: Database["public"]["Enums"]["receipt_status"]
          total_amount: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          image_url?: string | null
          merchant?: string | null
          purchased_at?: string | null
          raw_text?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          total_amount?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          image_url?: string | null
          merchant?: string | null
          purchased_at?: string | null
          raw_text?: string | null
          status?: Database["public"]["Enums"]["receipt_status"]
          total_amount?: number | null
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          current_amount: number
          daily_save_amount: number
          id: string
          in_wallet: boolean
          last_saved_on: string | null
          target_amount: number
          target_date: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          daily_save_amount?: number
          id?: string
          in_wallet?: boolean
          last_saved_on?: string | null
          target_amount?: number
          target_date?: string | null
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_amount?: number
          daily_save_amount?: number
          id?: string
          in_wallet?: boolean
          last_saved_on?: string | null
          target_amount?: number
          target_date?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_transactions: {
        Row: {
          amount: number
          created_at: string
          daily_limit: number | null
          daily_spend: number | null
          id: string
          kind: string
          note: string | null
          occurred_on: string
          pocket_id: string | null
          remaining_budget: number | null
          status: string | null
          total_required: number | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          daily_limit?: number | null
          daily_spend?: number | null
          id?: string
          kind: string
          note?: string | null
          occurred_on?: string
          pocket_id?: string | null
          remaining_budget?: number | null
          status?: string | null
          total_required?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          daily_limit?: number | null
          daily_spend?: number | null
          id?: string
          kind?: string
          note?: string | null
          occurred_on?: string
          pocket_id?: string | null
          remaining_budget?: number | null
          status?: string | null
          total_required?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_transactions_pocket_id_fkey"
            columns: ["pocket_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      process_daily_auto_savings: {
        Args: { p_run_date?: string }
        Returns: Json
      }
      recalculate_savings_streak: {
        Args: { _through_date?: string; _user_id: string }
        Returns: number
      }
    }
    Enums: {
      receipt_status: "processing" | "completed" | "failed"
      spending_category:
        | "Food"
        | "Transport"
        | "Utilities"
        | "Shopping"
        | "Entertainment"
        | "Others"
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
    Enums: {
      receipt_status: ["processing", "completed", "failed"],
      spending_category: [
        "Food",
        "Transport",
        "Utilities",
        "Shopping",
        "Entertainment",
        "Others",
      ],
    },
  },
} as const
