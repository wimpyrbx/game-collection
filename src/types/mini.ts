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
    id: number
    name: string
    categories: {
      id: number
      name: string
    }[]
  }[]
  painted_by?: {
    id: number
    painted_by_name: string
  }
  base_size?: {
    id: number
    base_size_name: string
  }
  product_set?: {
    id: number
    name: string
    product_line: {
      id: number
      name: string
      company: {
        id: number
        name: string
      }
    }
  }
} 