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

async function getOrCreateTags(tags: Array<{ id: number, name: string }>) {
  const allTags = []
  
  for (const tag of tags) {
    if (tag.id > 0) {
      // Existing tag, just add it to the array
      allTags.push(tag)
    } else {
      // Check if tag with this name already exists
      const { data: existingTag, error: findError } = await supabase
        .from('tags')
        .select('*')
        .ilike('name', tag.name)
        .single()

      if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw findError
      }

      if (existingTag) {
        // Use existing tag
        allTags.push(existingTag)
      } else {
        // Create new tag
        const { data: newTag, error: createError } = await supabase
          .from('tags')
          .insert({ name: tag.name })
          .select()
          .single()

        if (createError) throw createError
        allTags.push(newTag)
      }
    }
  }
  
  return allTags
}

export async function createMiniature(data: Partial<Mini>) {
  try {
    // First create the miniature without types to get its ID
    const miniatureData = {
      name: data.name,
      description: data.description,
      location: data.location,
      quantity: data.quantity,
      painted_by_id: data.painted_by_id,
      base_size_id: data.base_size_id,
      product_set_id: data.product_set_id
    }

    const { data: newMini, error: miniError } = await supabase
      .from('minis')
      .insert(miniatureData)
      .select()
      .single()

    if (miniError) throw miniError

    // Then create the type relationships with the new mini ID
    if (data.types && data.types.length > 0) {
      const typeRelations = data.types.map(t => ({
        mini_id: newMini.id,
        type_id: t.type_id,
        proxy_type: t.proxy_type
      }))

      const { error: typesError } = await supabase
        .from('mini_to_types')
        .insert(typeRelations)

      if (typesError) throw typesError
    }

    // Handle tags if present
    if (data.tags && data.tags.length > 0) {
      const tagRelations = data.tags.map(t => ({
        mini_id: newMini.id,
        tag_id: t.id
      }))

      const { error: tagsError } = await supabase
        .from('mini_to_tags')
        .insert(tagRelations)

      if (tagsError) throw tagsError
    }

    return newMini
  } catch (error) {
    console.error('Error creating miniature:', error)
    throw error
  }
}

export async function updateMiniature(miniId: number, data: Partial<Mini>) {
  try {
    // First update the miniature basic data
    const miniatureData = {
      name: data.name,
      description: data.description,
      location: data.location,
      quantity: data.quantity,
      painted_by_id: data.painted_by_id,
      base_size_id: data.base_size_id,
      product_set_id: data.product_set_id
    }

    const { error: miniError } = await supabase
      .from('minis')
      .update(miniatureData)
      .eq('id', miniId)

    if (miniError) throw miniError

    // Then handle types - first delete existing relationships
    const { error: deleteTypesError } = await supabase
      .from('mini_to_types')
      .delete()
      .eq('mini_id', miniId)

    if (deleteTypesError) throw deleteTypesError

    // Then create new type relationships
    if (data.types && data.types.length > 0) {
      const typeRelations = data.types.map(t => ({
        mini_id: miniId,
        type_id: t.type_id,
        proxy_type: t.proxy_type
      }))

      const { error: typesError } = await supabase
        .from('mini_to_types')
        .insert(typeRelations)

      if (typesError) throw typesError
    }

    // Handle tags - first delete existing relationships
    const { error: deleteTagsError } = await supabase
      .from('mini_to_tags')
      .delete()
      .eq('mini_id', miniId)

    if (deleteTagsError) throw deleteTagsError

    // Then create new tag relationships
    if (data.tags && data.tags.length > 0) {
      const tagRelations = data.tags.map(t => ({
        mini_id: miniId,
        tag_id: t.id
      }))

      const { error: tagsError } = await supabase
        .from('mini_to_tags')
        .insert(tagRelations)

      if (tagsError) throw tagsError
    }

    return { id: miniId, ...miniatureData }
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
        tag:tags(
          id,
          name
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  // Transform the tags data structure to match what the component expects
  if (data && data.tags) {
    data.tags = data.tags.map((tagRel: any) => ({
      id: tagRel.tag.id,
      name: tagRel.tag.name
    }))
  }

  return data
}
 