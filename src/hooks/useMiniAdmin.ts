import { useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useMiniAdmin() {
  const loadMinis = useCallback(async (
    offset: number = 0,
    limit: number = 10,
    search: string = ''
  ) => {
    try {
      let query = supabase
        .from('minis')
        .select(`
          id,
          name,
          description,
          quantity,
          location,
          types:mini_to_types!inner(
            type:mini_types!inner(
              id,
              name,
              categories:type_to_categories!inner(
                category:mini_categories!inner(
                  id,
                  name
                )
              )
            )
          ),
          painted_by!inner(
            id, 
            painted_by_name
          ),
          base_sizes!inner(
            id, 
            base_size_name
          ),
          product_sets!inner(
            id,
            name,
            product_lines!inner(
              id,
              name,
              company:product_companies!inner(
                id,
                name
              )
            )
          )
        `, { count: 'exact' })
      
      if (search) {
        query = query.or(`
          name.ilike.%${search}%,
          types.type.name.ilike.%${search}%,
          product_sets.name.ilike.%${search}%,
          product_sets.product_lines.name.ilike.%${search}%,
          product_sets.product_lines.company.name.ilike.%${search}%
        `)
      }
      
      const { data: items, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('name')

      if (error) throw error

      return { data: items, count }
    } catch (error) {
      console.error('Error loading minis:', error)
      return { error }
    }
  }, [])

  const addMini = useCallback(async (data: any) => {
    try {
      // Insert mini
      const { data: newMini, error: miniError } = await supabase
        .from('minis')
        .insert({
          name: data.name,
          painted_by_id: data.painted_by_id,
          base_size_id: data.base_size_id,
          product_set_id: data.product_set_id
        })
        .select()
        .single()

      if (miniError) throw miniError

      // Insert types
      if (data.types && data.types.length > 0) {
        const { error: typesError } = await supabase
          .from('mini_to_types')
          .insert(
            data.types.map((typeId: number) => ({
              mini_id: newMini.id,
              type_id: typeId
            }))
          )

        if (typesError) throw typesError
      }

      return { data: newMini }
    } catch (error) {
      console.error('Error adding mini:', error)
      return { error }
    }
  }, [])

  const editMini = useCallback(async (id: number, data: any) => {
    try {
      // Update mini
      const { error: miniError } = await supabase
        .from('minis')
        .update({
          name: data.name,
          painted_by_id: data.painted_by_id,
          base_size_id: data.base_size_id,
          product_set_id: data.product_set_id
        })
        .eq('id', id)

      if (miniError) throw miniError

      // Update types if provided
      if (data.types !== undefined) {
        // Delete existing types
        const { error: deleteError } = await supabase
          .from('mini_to_types')
          .delete()
          .eq('mini_id', id)

        if (deleteError) throw deleteError

        // Insert new types
        if (data.types && data.types.length > 0) {
          const { error: typesError } = await supabase
            .from('mini_to_types')
            .insert(
              data.types.map((typeId: number) => ({
                mini_id: id,
                type_id: typeId
              }))
            )

          if (typesError) throw typesError
        }
      }

      return { data: { id } }
    } catch (error) {
      console.error('Error editing mini:', error)
      return { error }
    }
  }, [])

  const deleteMini = useCallback(async (id: number) => {
    try {
      // Delete related records first
      const { error: typesError } = await supabase
        .from('mini_to_types')
        .delete()
        .eq('mini_id', id)

      if (typesError) throw typesError

      // Delete the mini
      const { error: miniError } = await supabase
        .from('minis')
        .delete()
        .eq('id', id)

      if (miniError) throw miniError

      return { data: { success: true } }
    } catch (error) {
      console.error('Error deleting mini:', error)
      return { error }
    }
  }, [])

  return {
    loadMinis,
    addMini,
    editMini,
    deleteMini
  }
} 