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

export async function updateMiniature(id: number, mini: Partial<Mini>) {
  try {
    // Update the miniature
    const { error: miniError } = await supabase
      .from('minis')
      .update({
        name: mini.name,
        description: mini.description,
        location: mini.location,
        quantity: mini.quantity,
        painted_by_id: mini.painted_by_id,
        base_size_id: mini.base_size_id,
        product_set_id: mini.product_set_id
      })
      .eq('id', id)

    if (miniError) throw miniError

    // Update tags
    const { error: deleteTagsError } = await supabase
      .from('mini_to_tags')
      .delete()
      .eq('mini_id', id)

    if (deleteTagsError) throw deleteTagsError

    if (mini.tags && mini.tags.length > 0) {
      const { error: tagsError } = await supabase
        .from('mini_to_tags')
        .insert(
          mini.tags.map(tag => ({
            mini_id: id,
            tag_id: tag.id
          }))
        )

      if (tagsError) throw tagsError
    }

    return { id }
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

export const getMiniature = async (id: number) => {
  const { data, error } = await supabase
    .from('minis')
    .select(`
      *,
      painted_by:painted_by_id(*),
      base_size:base_size_id(*),
      product_sets(*),
      types:mini_to_types(
        type:type_id(*),
        proxy_type
      ),
      tags:mini_to_tags(
        tag:tag_id(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
 