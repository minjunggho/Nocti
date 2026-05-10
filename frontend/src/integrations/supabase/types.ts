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
      companies: {
        Row: {
          about: string | null
          authority_status: string | null
          benefits: string[] | null
          contact_info: string | null
          created_at: string
          culture: string | null
          dba_name: string | null
          dot_number: string | null
          drivers_count: number | null
          equipment_types: string[] | null
          experience_level: string | null
          fmcsa_raw: Json | null
          hazmat_required: boolean | null
          home_time_policy: string | null
          hq_address: string | null
          id: string
          inspections_24mo: number | null
          legal_name: string | null
          logo_url: string | null
          mc_number: string | null
          mcs150_date: string | null
          mcs150_mileage: number | null
          onboarding_complete: boolean
          onboarding_step: number
          oos_inspections_24mo: number | null
          oos_rate_driver: number | null
          oos_rate_vehicle: number | null
          operating_status: string | null
          pay_max: number | null
          pay_min: number | null
          power_units: number | null
          preferred_lanes: string[] | null
          safety_rating: string | null
          safety_rating_date: string | null
          scrape_raw: Json | null
          services: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          about?: string | null
          authority_status?: string | null
          benefits?: string[] | null
          contact_info?: string | null
          created_at?: string
          culture?: string | null
          dba_name?: string | null
          dot_number?: string | null
          drivers_count?: number | null
          equipment_types?: string[] | null
          experience_level?: string | null
          fmcsa_raw?: Json | null
          hazmat_required?: boolean | null
          home_time_policy?: string | null
          hq_address?: string | null
          id?: string
          inspections_24mo?: number | null
          legal_name?: string | null
          logo_url?: string | null
          mc_number?: string | null
          mcs150_date?: string | null
          mcs150_mileage?: number | null
          onboarding_complete?: boolean
          onboarding_step?: number
          oos_inspections_24mo?: number | null
          oos_rate_driver?: number | null
          oos_rate_vehicle?: number | null
          operating_status?: string | null
          pay_max?: number | null
          pay_min?: number | null
          power_units?: number | null
          preferred_lanes?: string[] | null
          safety_rating?: string | null
          safety_rating_date?: string | null
          scrape_raw?: Json | null
          services?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          about?: string | null
          authority_status?: string | null
          benefits?: string[] | null
          contact_info?: string | null
          created_at?: string
          culture?: string | null
          dba_name?: string | null
          dot_number?: string | null
          drivers_count?: number | null
          equipment_types?: string[] | null
          experience_level?: string | null
          fmcsa_raw?: Json | null
          hazmat_required?: boolean | null
          home_time_policy?: string | null
          hq_address?: string | null
          id?: string
          inspections_24mo?: number | null
          legal_name?: string | null
          logo_url?: string | null
          mc_number?: string | null
          mcs150_date?: string | null
          mcs150_mileage?: number | null
          onboarding_complete?: boolean
          onboarding_step?: number
          oos_inspections_24mo?: number | null
          oos_rate_driver?: number | null
          oos_rate_vehicle?: number | null
          operating_status?: string | null
          pay_max?: number | null
          pay_min?: number | null
          power_units?: number | null
          preferred_lanes?: string[] | null
          safety_rating?: string | null
          safety_rating_date?: string | null
          scrape_raw?: Json | null
          services?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
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
