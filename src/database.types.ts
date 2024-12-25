export interface Database {
  public: {
    Tables: {
      minis: {
        Row: {
          id: number
          name: string
          description: string | null
          location: string
          quantity: number
          created_at: string
          updated_at: string
          painted_by_id: number
          base_size_id: number
          product_set_id: number | null
          in_use: boolean | null
          material_id: number | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          location: string
          quantity?: number
          created_at?: string
          updated_at?: string
          painted_by_id: number
          base_size_id: number
          product_set_id?: number | null
          in_use?: boolean | null
          material_id?: number | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          location?: string
          quantity?: number
          created_at?: string
          updated_at?: string
          painted_by_id?: number
          base_size_id?: number
          product_set_id?: number | null
          in_use?: boolean | null
          material_id?: number | null
        }
      }
      minis_materials: {
        Row: {
          id: number
          material_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          material_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          material_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: number
          created_at: string
          table: string
          action: string
          record_id: number
          old_data: any
          new_data: any
        }
        Insert: {
          id?: number
          created_at?: string
          table: string
          action: string
          record_id: number
          old_data?: any
          new_data?: any
        }
        Update: {
          id?: number
          created_at?: string
          table?: string
          action?: string
          record_id?: number
          old_data?: any
          new_data?: any
        }
      }
      base_sizes: {
        Row: {
          id: number
          base_size_name: string
        }
        Insert: {
          id?: number
          base_size_name: string
        }
        Update: {
          id?: number
          base_size_name?: string
        }
      }
      painted_by: {
        Row: {
          id: number
          painted_by_name: string
        }
        Insert: {
          id?: number
          painted_by_name: string
        }
        Update: {
          id?: number
          painted_by_name?: string
        }
      }
      mini_types: {
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
      }
      mini_to_types: {
        Row: {
          mini_id: number
          type_id: number
          proxy_type: boolean
        }
        Insert: {
          mini_id: number
          type_id: number
          proxy_type?: boolean
        }
        Update: {
          mini_id?: number
          type_id?: number
          proxy_type?: boolean
        }
      }
      product_sets: {
        Row: {
          id: number
          name: string
          product_line_id: number
        }
        Insert: {
          id?: number
          name: string
          product_line_id: number
        }
        Update: {
          id?: number
          name?: string
          product_line_id?: number
        }
      }
      product_lines: {
        Row: {
          id: number
          name: string
          company_id: number
        }
        Insert: {
          id?: number
          name: string
          company_id: number
        }
        Update: {
          id?: number
          name?: string
          company_id?: number
        }
      }
      product_companies: {
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
      }
    }
  }
} 