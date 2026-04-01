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
      client_demands: {
        Row: {
          client_id: string
          commercial_id: string
          created_at: string
          demand_date: string
          id: string
          product_id: string
          quantity: number
          status: Database["public"]["Enums"]["demand_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          commercial_id: string
          created_at?: string
          demand_date?: string
          id?: string
          product_id: string
          quantity?: number
          status?: Database["public"]["Enums"]["demand_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          commercial_id?: string
          created_at?: string
          demand_date?: string
          id?: string
          product_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["demand_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_demands_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_demands_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          client_code: string | null
          commercial_id: string | null
          company_name: string
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          sector: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_code?: string | null
          commercial_id?: string | null
          company_name: string
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          sector?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          client_code?: string | null
          commercial_id?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          sector?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_equivalences: {
        Row: {
          created_at: string
          equivalence_type: Database["public"]["Enums"]["equivalence_type"]
          equivalent_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          equivalence_type?: Database["public"]["Enums"]["equivalence_type"]
          equivalent_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          equivalence_type?: Database["public"]["Enums"]["equivalence_type"]
          equivalent_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_equivalences_equivalent_id_fkey"
            columns: ["equivalent_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_equivalences_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          code_article: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          price_ht: number | null
          price_ttc: number | null
          reference: string
          stock_available: number
          supplier: string | null
          supply_delay_days: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          code_article?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_ht?: number | null
          price_ttc?: number | null
          reference: string
          stock_available?: number
          supplier?: string | null
          supply_delay_days?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          code_article?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_ht?: number | null
          price_ttc?: number | null
          reference?: string
          stock_available?: number
          supplier?: string | null
          supply_delay_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_products: {
        Row: {
          created_at: string
          estimated_quantity: number | null
          id: string
          product_id: string
          urgency: Database["public"]["Enums"]["urgency_level"] | null
          visit_id: string
        }
        Insert: {
          created_at?: string
          estimated_quantity?: number | null
          id?: string
          product_id: string
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          visit_id: string
        }
        Update: {
          created_at?: string
          estimated_quantity?: number | null
          id?: string
          product_id?: string
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_products_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          audio_url: string | null
          client_id: string
          commercial_id: string
          contact_name: string | null
          contact_role: string | null
          created_at: string
          id: string
          location: string | null
          report: string | null
          status: Database["public"]["Enums"]["visit_status"]
          summary: string | null
          sync_error: string | null
          sync_status: string | null
          transcription: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          audio_url?: string | null
          client_id: string
          commercial_id: string
          contact_name?: string | null
          contact_role?: string | null
          created_at?: string
          id?: string
          location?: string | null
          report?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          summary?: string | null
          sync_error?: string | null
          sync_status?: string | null
          transcription?: string | null
          updated_at?: string
          visit_date?: string
        }
        Update: {
          audio_url?: string | null
          client_id?: string
          commercial_id?: string
          contact_name?: string | null
          contact_role?: string | null
          created_at?: string
          id?: string
          location?: string | null
          report?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          summary?: string | null
          sync_error?: string | null
          sync_status?: string | null
          transcription?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_distinct_product_filters: {
        Args: never
        Returns: {
          filter_type: string
          filter_value: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "commercial"
      demand_status: "disponible" | "en_rupture" | "en_commande"
      equivalence_type: "strict" | "avec_joint" | "sans_joint" | "autre_labo"
      urgency_level: "faible" | "moyenne" | "haute"
      visit_status: "opportunite" | "prise_de_contact" | "commande_probable"
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
      app_role: ["admin", "manager", "commercial"],
      demand_status: ["disponible", "en_rupture", "en_commande"],
      equivalence_type: ["strict", "avec_joint", "sans_joint", "autre_labo"],
      urgency_level: ["faible", "moyenne", "haute"],
      visit_status: ["opportunite", "prise_de_contact", "commande_probable"],
    },
  },
} as const
