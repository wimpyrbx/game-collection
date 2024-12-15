export interface Mini {
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
  types?: {
    type: {
      id: number
      name: string
      categories: {
        category: {
          id: number
          name: string
        }
      }[]
    }[]
    proxy_type: any
    mini_id: number
    type_id: number
  }[]
  painted_by?: {
    id: number
    painted_by_name: string
  }
  base_size?: {
    id: number
    base_size_name: string
  }
  product_sets?: {
    name: string
    product_lines?: {
      name: string
      company?: {
        name: string
      }
    }
  }
}

export interface MiniType {
  id: number
  name: string
  categories?: {
    category: {
      id: number
      name: string
    }
  }[]
}

export interface MiniCategory {
  id: number
  name: string
} 