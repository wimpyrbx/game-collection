import { supabase } from '../lib/supabase'

interface MiniatureType {
  id: number
  proxy_type: boolean
}

interface MiniatureData {
  name: string
  description: string
  location: string
  quantity: number
  painted_by_id: number
  base_size_id: number
  product_set_id: number | null
  types: MiniatureType[]
}

export async function createMiniature(data: MiniatureData) {
  try {
    // Insert the miniature
    const { data: newMini, error: miniError } = await supabase
      .from('minis')
      .insert({
        name: data.name,
        description: data.description,
        location: data.location,
        quantity: data.quantity,
        painted_by_id: data.painted_by_id,
        base_size_id: data.base_size_id,
        product_set_id: data.product_set_id
      })
      .select()
      .single()

    if (miniError) throw miniError

    // Insert type relationships if any types are provided
    if (data.types && data.types.length > 0) {
      const { error: typesError } = await supabase
        .from('mini_to_types')
        .insert(
          data.types.map(type => ({
            mini_id: newMini.id,
            type_id: type.id,
            proxy_type: type.proxy_type
          }))
        )

      if (typesError) throw typesError
    }

    return newMini
  } catch (error) {
    console.error('Error creating miniature:', error)
    throw error
  }
}

export async function updateMiniature(miniId: number, data: MiniatureData) {
  try {
    // Update the miniature
    const { error: miniError } = await supabase
      .from('minis')
      .update({
        name: data.name,
        description: data.description,
        location: data.location,
        quantity: data.quantity,
        painted_by_id: data.painted_by_id,
        base_size_id: data.base_size_id,
        product_set_id: data.product_set_id
      })
      .eq('id', miniId)

    if (miniError) throw miniError

    // Delete existing type relationships
    const { error: deleteError } = await supabase
      .from('mini_to_types')
      .delete()
      .eq('mini_id', miniId)

    if (deleteError) throw deleteError

    // Insert new type relationships if any types are provided
    if (data.types && data.types.length > 0) {
      const { error: typesError } = await supabase
        .from('mini_to_types')
        .insert(
          data.types.map(type => ({
            mini_id: miniId,
            type_id: type.id,
            proxy_type: type.proxy_type
          }))
        )

      if (typesError) throw typesError
    }

    return { id: miniId }
  } catch (error) {
    console.error('Error updating miniature:', error)
    throw error
  }
}

export async function deleteMiniature(miniId: number) {
  try {
    // First, try to delete the images
    const formData = new FormData()
    formData.append('id', miniId.toString())
    
    const imageResponse = await fetch('/phpscripts/deleteImage.php', {
      method: 'POST',
      body: formData
    })
    
    if (!imageResponse.ok) {
      console.error('Failed to delete images:', await imageResponse.text())
      // Continue with deletion even if image deletion fails
    }

    // Delete the mini (relations will be deleted automatically due to ON DELETE CASCADE)
    const { error: miniError } = await supabase
      .from('minis')
      .delete()
      .eq('id', miniId)

    if (miniError) throw miniError

    return { success: true }
  } catch (error) {
    console.error('Error deleting miniature:', error)
    throw error
  }
} 