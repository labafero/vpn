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
      broadcast_config: {
        Row: {
          character_name: string
          cidade: string | null
          id: number
          passport_id: string
          phone: string
          title: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          character_name?: string
          cidade?: string | null
          id?: never
          passport_id?: string
          phone?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          character_name?: string
          cidade?: string | null
          id?: never
          passport_id?: string
          phone?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_config_cidade_fkey"
            columns: ["cidade"]
            isOneToOne: false
            referencedRelation: "city_config"
            referencedColumns: ["slug"]
          },
        ]
      }
      city_config: {
        Row: {
          cidade_nome: string
          cor_primaria: string
          created_at: string | null
          id: number
          jornal_nome: string
          jornal_sigla: string
          logo_url: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          cidade_nome: string
          cor_primaria?: string
          created_at?: string | null
          id?: never
          jornal_nome: string
          jornal_sigla?: string
          logo_url?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          cidade_nome?: string
          cor_primaria?: string
          created_at?: string | null
          id?: never
          jornal_nome?: string
          jornal_sigla?: string
          logo_url?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      market_values: {
        Row: {
          cidade: string
          created_at: string
          id: number
          label: string
          trend: string
          user_id: string
          value: string
        }
        Insert: {
          cidade?: string
          created_at?: string
          id?: never
          label: string
          trend?: string
          user_id: string
          value: string
        }
        Update: {
          cidade?: string
          created_at?: string
          id?: never
          label?: string
          trend?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          body: string
          cidade: string
          cover_url: string
          created_at: string
          destaque: boolean
          id: number
          media_type: string | null
          media_url: string | null
          published_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          cidade: string
          cover_url?: string
          created_at?: string
          destaque?: boolean
          id?: never
          media_type?: string | null
          media_url?: string | null
          published_at: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          cidade?: string
          cover_url?: string
          created_at?: string
          destaque?: boolean
          id?: never
          media_type?: string | null
          media_url?: string | null
          published_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      server_clock: {
        Row: {
          brt_reference: string
          id: number
          ls_hours: number
          ls_minutes: number
          updated_at: string
        }
        Insert: {
          brt_reference?: string
          id?: number
          ls_hours?: number
          ls_minutes?: number
          updated_at?: string
        }
        Update: {
          brt_reference?: string
          id?: number
          ls_hours?: number
          ls_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      spotify_connection: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: number
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: never
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: never
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      market_values_latest: {
        Row: {
          cidade: string | null
          created_at: string | null
          id: number | null
          label: string | null
          trend: string | null
          user_id: string | null
          value: string | null
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
