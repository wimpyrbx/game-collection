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
    mini_id: number
    type_id: number
    proxy_type: any
    type: {
      id: number
      name: string
      categories: {
        category: {
          id: number
          name: string
        }[]
      }[]
    }
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
    id: number
    name: string
    product_lines?: {
      id: number
      name: string
      company?: {
        id: number
        name: string
      }
    }
  }[]
}

export interface MiniType {
  id: number
  name: string
  categories: {
    category: {
      id: number
      name: string
    }[]
  }[]
}

export interface MiniCategory {
  id: number
  name: string
} 