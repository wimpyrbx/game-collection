// src/pages/Testing.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Define the type based on what we expect from the API
interface ProductGroup {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function Testing() {
  // Set the correct type for data state
  const [data, setData] = useState<ProductGroup[] | null>(null)

  useEffect(() => {
    async function getData() {
      const { data, error } = await supabase
        .from('product_groups')
        .select('*')
      
      if (error) console.log('Error:', error)
      else setData(data)
    }
    getData()
  }, [])

  return (
    <div>
      <h1>Testing Page</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
