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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      documents: {
        Row: {
          document_type: string
          drive_file_id: string | null
          file_name: string
          file_url: string
          id: string
          resident_id: string | null
          uploaded_at: string | null
        }
        Insert: {
          document_type: string
          drive_file_id?: string | null
          file_name: string
          file_url: string
          id?: string
          resident_id?: string | null
          uploaded_at?: string | null
        }
        Update: {
          document_type?: string
          drive_file_id?: string | null
          file_name?: string
          file_url?: string
          id?: string
          resident_id?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      food_menu: {
        Row: {
          breakfast: string | null
          day_of_week: string
          dinner: string | null
          evening_snacks: string | null
          id: string
          lunch: string | null
          updated_at: string | null
        }
        Insert: {
          breakfast?: string | null
          day_of_week: string
          dinner?: string | null
          evening_snacks?: string | null
          id?: string
          lunch?: string | null
          updated_at?: string | null
        }
        Update: {
          breakfast?: string | null
          day_of_week?: string
          dinner?: string | null
          evening_snacks?: string | null
          id?: string
          lunch?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      google_drive_config: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          refresh_token: string
          root_folder_id: string | null
          token_expiry: string
          updated_at: string | null
          user_email: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          refresh_token: string
          root_folder_id?: string | null
          token_expiry: string
          updated_at?: string | null
          user_email?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          refresh_token?: string
          root_folder_id?: string | null
          token_expiry?: string
          updated_at?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          month_year: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          receipt_number: string | null
          resident_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          month_year?: string | null
          notes?: string | null
          payment_date: string
          payment_method: string
          receipt_number?: string | null
          resident_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          month_year?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          receipt_number?: string | null
          resident_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          reminder_type: string
          resident_id: string | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          reminder_type: string
          resident_id?: string | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          reminder_type?: string
          resident_id?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_extra_charges: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date_charged: string
          description: string
          id: string
          is_billed: boolean | null
          month_year: string
          payment_id: string | null
          resident_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string | null
          date_charged?: string
          description: string
          id?: string
          is_billed?: boolean | null
          month_year: string
          payment_id?: string | null
          resident_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date_charged?: string
          description?: string
          id?: string
          is_billed?: boolean | null
          month_year?: string
          payment_id?: string | null
          resident_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      residents: {
        Row: {
          aadhaar_number: string | null
          address: string | null
          age: number | null
          allergies: string | null
          children_details: string | null
          chronic_illnesses: string | null
          created_at: string | null
          date_of_birth: string | null
          emergency_contact_address: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          full_name: string
          gender: string | null
          guardian_address: string | null
          guardian_financial_responsibility: boolean | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          id: string
          marital_status: string | null
          number_of_children: number | null
          pan_number: string | null
          past_surgeries: string | null
          phone: string | null
          photo_url: string | null
          special_medical_notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          aadhaar_number?: string | null
          address?: string | null
          age?: number | null
          allergies?: string | null
          children_details?: string | null
          chronic_illnesses?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          full_name: string
          gender?: string | null
          guardian_address?: string | null
          guardian_financial_responsibility?: boolean | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          marital_status?: string | null
          number_of_children?: number | null
          pan_number?: string | null
          past_surgeries?: string | null
          phone?: string | null
          photo_url?: string | null
          special_medical_notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          aadhaar_number?: string | null
          address?: string | null
          age?: number | null
          allergies?: string | null
          children_details?: string | null
          chronic_illnesses?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          full_name?: string
          gender?: string | null
          guardian_address?: string | null
          guardian_financial_responsibility?: boolean | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          marital_status?: string | null
          number_of_children?: number | null
          pan_number?: string | null
          past_surgeries?: string | null
          phone?: string | null
          photo_url?: string | null
          special_medical_notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      room_assignments: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          resident_id: string | null
          room_id: string | null
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          resident_id?: string | null
          room_id?: string | null
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          resident_id?: string | null
          room_id?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_assignments_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          base_monthly_charge: number
          created_at: string | null
          id: string
          included_services: string | null
          max_capacity: number
          room_number: string
          room_type: string
          status: string | null
        }
        Insert: {
          base_monthly_charge: number
          created_at?: string | null
          id?: string
          included_services?: string | null
          max_capacity?: number
          room_number: string
          room_type: string
          status?: string | null
        }
        Update: {
          base_monthly_charge?: number
          created_at?: string | null
          id?: string
          included_services?: string | null
          max_capacity?: number
          room_number?: string
          room_type?: string
          status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin"
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
      app_role: ["super_admin", "admin"],
    },
  },
} as const
