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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          id: string
          login: string
          password: string
        }
        Insert: {
          created_at?: string
          id?: string
          login: string
          password: string
        }
        Update: {
          created_at?: string
          id?: string
          login?: string
          password?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      colors: {
        Row: {
          created_at: string | null
          hex_code: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hex_code: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hex_code?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          name: string
          phone: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          name: string
          phone: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          cart_items: Json
          comment: string | null
          confirmed_at: string | null
          created_at: string | null
          delivery: string | null
          discount: number | null
          email: string
          id: string
          name: string
          order_number: string | null
          order_status: string | null
          payment: string | null
          phone: string
          subtotal: number
          total: number
          yandex_address: string | null
        }
        Insert: {
          cart_items: Json
          comment?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          delivery?: string | null
          discount?: number | null
          email: string
          id?: string
          name: string
          order_number?: string | null
          order_status?: string | null
          payment?: string | null
          phone: string
          subtotal: number
          total: number
          yandex_address?: string | null
        }
        Update: {
          cart_items?: Json
          comment?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          delivery?: string | null
          discount?: number | null
          email?: string
          id?: string
          name?: string
          order_number?: string | null
          order_status?: string | null
          payment?: string | null
          phone?: string
          subtotal?: number
          total?: number
          yandex_address?: string | null
        }
        Relationships: []
      }
      product_prices: {
        Row: {
          price_rub: number
          product_id: string
          updated_at: string | null
        }
        Insert: {
          price_rub: number
          product_id: string
          updated_at?: string | null
        }
        Update: {
          price_rub?: number
          product_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          artikul: string
          color_hex: string
          created_at: string | null
          dimensions: Json
          id: string
          id_wb: string | null
          is_active: boolean
          name: string
          photos: string[]
          price_rub: number
          size: Database["public"]["Enums"]["product_size"]
          updated_at: string | null
          videos: string[] | null
          weight: number
        }
        Insert: {
          artikul: string
          color_hex?: string
          created_at?: string | null
          dimensions: Json
          id: string
          id_wb?: string | null
          is_active?: boolean
          name: string
          photos: string[]
          price_rub: number
          size?: Database["public"]["Enums"]["product_size"]
          updated_at?: string | null
          videos?: string[] | null
          weight: number
        }
        Update: {
          artikul?: string
          color_hex?: string
          created_at?: string | null
          dimensions?: Json
          id?: string
          id_wb?: string | null
          is_active?: boolean
          name?: string
          photos?: string[]
          price_rub?: number
          size?: Database["public"]["Enums"]["product_size"]
          updated_at?: string | null
          videos?: string[] | null
          weight?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_photo_paths: {
        Args: { color: string; size_category: string }
        Returns: string[]
      }
      get_color_hex: {
        Args: { color_name: string }
        Returns: string
      }
      get_product_size: {
        Args: { category: string; dimensions: Json }
        Returns: Database["public"]["Enums"]["product_size"]
      }
      is_admin_user: {
        Args: { login_input: string; password_input: string }
        Returns: boolean
      }
      parse_dimensions: {
        Args: { dimension_str: string }
        Returns: Json
      }
      storage_public_url: {
        Args: { bucket: string; project_ref: string; rel_path: string }
        Returns: string
      }
    }
    Enums: {
      product_size: "small" | "medium" | "big"
      size_type_enum: "малая" | "средняя" | "большая"
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
      product_size: ["small", "medium", "big"],
      size_type_enum: ["малая", "средняя", "большая"],
    },
  },
} as const
