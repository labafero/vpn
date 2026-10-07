
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"private": {
          Tables: {
            "foundation_audit": {
                  Row: {
                    "code": string,"connection_id": string,"created_at": string,"id": string
                  }
                  Insert: {
                    "code": string,"connection_id": string,"created_at"?: string,"id"?: string
                  }
                  Update: {
                    "code"?: string,"connection_id"?: string,"created_at"?: string,"id"?: string
                  }
                  Relationships: [

                  ]
                },"oauth_transactions": {
                  Row: {
                    "browser_nonce_hash": string,"consent_version": string,"consumed_at": string | null,"expires_at": string,"state_hash": string,"user_id": string
                  }
                  Insert: {
                    "browser_nonce_hash": string,"consent_version": string,"consumed_at"?: string | null,"expires_at": string,"state_hash": string,"user_id": string
                  }
                  Update: {
                    "browser_nonce_hash"?: string,"consent_version"?: string,"consumed_at"?: string | null,"expires_at"?: string,"state_hash"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"provider_credentials": {
                  Row: {
                    "ciphertext": string,"connection_id": string,"expires_at": string,"iv": string,"key_version": string,"retry_until": string | null,"tag": string,"validated_at": string
                  }
                  Insert: {
                    "ciphertext": string,"connection_id": string,"expires_at": string,"iv": string,"key_version": string,"retry_until"?: string | null,"tag": string,"validated_at": string
                  }
                  Update: {
                    "ciphertext"?: string,"connection_id"?: string,"expires_at"?: string,"iv"?: string,"key_version"?: string,"retry_until"?: string | null,"tag"?: string,"validated_at"?: string
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_vpn_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"vpn_session_active":
{ Args: { "owner_id": string,"session_id": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "broadcast_config": {
                  Row: {
                    "cidade": string | null,"id": number,"title": string,"updated_at": string,"updated_by": string | null,"user_id": string
                  }
                  Insert: {
                    "cidade"?: string | null,"id"?: never,"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id": string
                  }
                  Update: {
                    "cidade"?: string | null,"id"?: never,"title"?: string,"updated_at"?: string,"updated_by"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "broadcast_config_cidade_fkey"
      columns: ["cidade"]
isOneToOne: false
      referencedRelation: "city_config"
      referencedColumns: ["slug"]
    }
                  ]
                },"channels": {
                  Row: {
                    "connection_id": string,"id": string,"monitoring_enabled": boolean,"owner_id": string
                  }
                  Insert: {
                    "connection_id": string,"id"?: string,"monitoring_enabled"?: boolean,"owner_id": string
                  }
                  Update: {
                    "connection_id"?: string,"id"?: string,"monitoring_enabled"?: boolean,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "channels_connection_id_owner_id_fkey"
      columns: ["connection_id","owner_id"]
isOneToOne: false
      referencedRelation: "provider_connections"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"character_config": {
                  Row: {
                    "character_name": string,"cidade": string,"passport_id": string,"phone": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "character_name"?: string,"cidade": string,"passport_id"?: string,"phone"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "character_name"?: string,"cidade"?: string,"passport_id"?: string,"phone"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "character_config_cidade_fkey"
      columns: ["cidade"]
isOneToOne: false
      referencedRelation: "city_config"
      referencedColumns: ["slug"]
    }
                  ]
                },"city_config": {
                  Row: {
                    "cidade_nome": string,"cor_primaria": string,"created_at": string | null,"id": number,"jornal_nome": string,"jornal_sigla": string,"logo_url": string | null,"slug": string,"updated_at": string | null
                  }
                  Insert: {
                    "cidade_nome": string,"cor_primaria"?: string,"created_at"?: string | null,"id"?: never,"jornal_nome": string,"jornal_sigla"?: string,"logo_url"?: string | null,"slug": string,"updated_at"?: string | null
                  }
                  Update: {
                    "cidade_nome"?: string,"cor_primaria"?: string,"created_at"?: string | null,"id"?: never,"jornal_nome"?: string,"jornal_sigla"?: string,"logo_url"?: string | null,"slug"?: string,"updated_at"?: string | null
                  }
                  Relationships: [

                  ]
                },"city_seasons": {
                  Row: {
                    "cidade": string,"created_at": string,"ended_at": string | null,"id": number,"label": string,"started_at": string
                  }
                  Insert: {
                    "cidade": string,"created_at"?: string,"ended_at"?: string | null,"id"?: never,"label": string,"started_at"?: string
                  }
                  Update: {
                    "cidade"?: string,"created_at"?: string,"ended_at"?: string | null,"id"?: never,"label"?: string,"started_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "city_seasons_cidade_fkey"
      columns: ["cidade"]
isOneToOne: false
      referencedRelation: "city_config"
      referencedColumns: ["slug"]
    }
                  ]
                },"db_record_notes": {
                  Row: {
                    "body": string,"created_at": string,"created_by": string,"id": number,"record_id": number
                  }
                  Insert: {
                    "body": string,"created_at"?: string,"created_by": string,"id"?: never,"record_id": number
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"created_by"?: string,"id"?: never,"record_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "db_record_notes_record_id_fkey"
      columns: ["record_id"]
isOneToOne: false
      referencedRelation: "db_records"
      referencedColumns: ["id"]
    }
                  ]
                },"db_records": {
                  Row: {
                    "cidade": string | null,"created_at": string,"created_by": string,"dados": NonNullable<Json>,"id": number,"nome": string,"type": string,"updated_at": string
                  }
                  Insert: {
                    "cidade"?: string | null,"created_at"?: string,"created_by": string,"dados"?: NonNullable<Json>,"id"?: never,"nome"?: string,"type": string,"updated_at"?: string
                  }
                  Update: {
                    "cidade"?: string | null,"created_at"?: string,"created_by"?: string,"dados"?: NonNullable<Json>,"id"?: never,"nome"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "db_records_cidade_fkey"
      columns: ["cidade"]
isOneToOne: false
      referencedRelation: "city_config"
      referencedColumns: ["slug"]
    }
                  ]
                },"posts": {
                  Row: {
                    "body": string,"cidade": string,"cover_url": string,"created_at": string,"destaque": boolean,"id": number,"media_type": string | null,"media_url": string | null,"published_at": string,"season_id": number | null,"title": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "body"?: string,"cidade": string,"cover_url"?: string,"created_at"?: string,"destaque"?: boolean,"id"?: never,"media_type"?: string | null,"media_url"?: string | null,"published_at": string,"season_id"?: number | null,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "body"?: string,"cidade"?: string,"cover_url"?: string,"created_at"?: string,"destaque"?: boolean,"id"?: never,"media_type"?: string | null,"media_url"?: string | null,"published_at"?: string,"season_id"?: number | null,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_season_id_fkey"
      columns: ["season_id"]
isOneToOne: false
      referencedRelation: "city_seasons"
      referencedColumns: ["id"]
    }
                  ]
                },"provider_connections": {
                  Row: {
                    "connected_at": string,"consent_version": string,"consented_at": string,"id": string,"login": string,"provider": string,"provider_user_id": string,"revoked_at": string | null,"status": string,"user_id": string
                  }
                  Insert: {
                    "connected_at"?: string,"consent_version": string,"consented_at": string,"id"?: string,"login": string,"provider"?: string,"provider_user_id": string,"revoked_at"?: string | null,"status"?: string,"user_id": string
                  }
                  Update: {
                    "connected_at"?: string,"consent_version"?: string,"consented_at"?: string,"id"?: string,"login"?: string,"provider"?: string,"provider_user_id"?: string,"revoked_at"?: string | null,"status"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"server_clock": {
                  Row: {
                    "brt_reference": string,"id": number,"ls_hours": number,"ls_minutes": number,"updated_at": string
                  }
                  Insert: {
                    "brt_reference"?: string,"id"?: number,"ls_hours"?: number,"ls_minutes"?: number,"updated_at"?: string
                  }
                  Update: {
                    "brt_reference"?: string,"id"?: number,"ls_hours"?: number,"ls_minutes"?: number,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"user_roles": {
                  Row: {
                    "role": string,"user_id": string
                  }
                  Insert: {
                    "role": string,"user_id": string
                  }
                  Update: {
                    "role"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {

          }
        },"private": {
          Enums: {

          }
        },"public": {
          Enums: {

          }
        }
} as const
