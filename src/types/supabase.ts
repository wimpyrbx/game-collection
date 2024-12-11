export interface ProductGroup {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Product {
  id: number
  product_group_id: number
  product_type_id: number
  region_id: number
  rating_id: number | null
  pricecharting_id: number | null
  title: string
  variant: string | null
  release_year: number | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
