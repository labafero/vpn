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
      broadcast_config: {
        Row: {
          cidade: string | null
          id: number
          title: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          cidade?: string | null
          id?: never
          title?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          cidade?: string | null
          id?: never
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
      character_config: {
        Row: {
          character_name: string
          cidade: string
          passport_id: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          character_name?: string
          cidade: string
          passport_id?: string
          phone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          character_name?: string
          cidade?: string
          passport_id?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_config_cidade_fkey"
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
      city_seasons: {
        Row: {
          cidade: string
          created_at: string
          ended_at: string | null
          id: number
          label: string
          started_at: string
        }
        Insert: {
          cidade: string
          created_at?: string
          ended_at?: string | null
          id?: never
          label: string
          started_at?: string
        }
        Update: {
          cidade?: string
          created_at?: string
          ended_at?: string | null
          id?: never
          label?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_seasons_cidade_fkey"
            columns: ["cidade"]
            isOneToOne: false
            referencedRelation: "city_config"
            referencedColumns: ["slug"]
          },
        ]
      }
      db_record_notes: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: number
          record_id: number
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: never
          record_id: number
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: never
          record_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "db_record_notes_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "db_records"
            referencedColumns: ["id"]
          },
        ]
      }
      db_records: {
        Row: {
          cidade: string | null
          created_at: string
          created_by: string
          dados: Json
          id: number
          nome: string
          type: string
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          created_by: string
          dados?: Json
          id?: never
          nome?: string
          type: string
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          created_by?: string
          dados?: Json
          id?: never
          nome?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "db_records_cidade_fkey"
            columns: ["cidade"]
            isOneToOne: false
            referencedRelation: "city_config"
            referencedColumns: ["slug"]
          },
        ]
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
          season_id: number | null
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
          season_id?: number | null
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
          season_id?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "city_seasons"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {},
  },
} as const
