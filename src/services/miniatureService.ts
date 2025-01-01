import { supabase } from '../lib/supabaseMonitor'

interface MiniatureType {
  type_id: number
  proxy_type: boolean
}

interface MiniatureTag {
  id: number
  name: string
}

interface MiniatureData {
  name: string
  description: string | null
  location: string
  quantity: number
  painted_by_id: number
  base_size_id: number
  product_set_id: number | null
  material_id: number | null
  types?: MiniatureType[]
  tags?: MiniatureTag[]
}

// Add MINIATURE_QUERY constant at the top of the file
const MINIATURE_QUERY = `
  id,
  name,
  description,
  quantity,
  location,
  created_at,
  updated_at,
  painted_by_id,
  base_size_id,
  product_set_id,
  material_id,
  in_use,
  has_image,
  types:mini_to_types(
    mini_id,
    type_id,
    proxy_type,
    type:mini_types(
      id,
      name,
      categories:type_to_categories(
        category:mini_categories(
          id,
          name
        )
      )
    )
  ),
  painted_by(
    id, 
    painted_by_name
  ),
  base_sizes:base_size_id(
    id,
    base_size_name
  ),
  material:material_id(
    id,
    material_name
  ),
  product_sets:product_set_id(
    id,
    name,
    product_line:product_line_id(
      id,
      name,
      company:company_id(
        id,
        name
      )
    )
  ),
  tags:mini_to_tags(
    tag:tags(
      id,
      name
    )
  )
`

// Add function to update has_image status
const updateHasImage = async (miniId: number, hasImage: boolean) => {
  console.log('Updating has_image status:', { miniId, hasImage })
  
  // Update in Supabase
  const { data, error } = await supabase
    .from('minis')
    .update({ has_image: hasImage })
    .eq('id', miniId)
    .select(MINIATURE_QUERY)
    .single()
  
  if (error) {
    console.error('Error updating has_image status:', error)
    throw error
  }
  
  console.log('Successfully updated has_image status:', data)
  return data
}

// Modify uploadMiniatureImage to handle has_image update
export const uploadMiniatureImage = async (miniId: number, file: File, type: string = 'original') => {
  const formData = new FormData()
  formData.append('image', file)
  formData.append('miniId', miniId.toString())
  formData.append('type', type)

  console.log('Uploading image:', {
    miniId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type
  })

  try {
    const response = await fetch('/miniatures/phpscripts/uploadImage.php', {
      method: 'POST',
      body: formData
    })

    const responseText = await response.text()
    console.log('Upload response:', {
      status: response.status,
      statusText: response.statusText,
      responseText
    })

    if (!response.ok) {
      throw new Error(responseText || 'Failed to upload image')
    }

    // Try to parse the response as JSON
    let jsonResponse
    try {
      jsonResponse = JSON.parse(responseText)
      console.log('Parsed response:', jsonResponse)
    } catch (e) {
      console.error('Failed to parse response as JSON:', e)
    }

    // If upload was successful, update has_image to true
    return await updateHasImage(miniId, true)
  } catch (error) {
    console.error('Image upload error:', error)
    throw error
  }
}

// Modify deleteMiniatureImage to handle has_image update
export const deleteMiniatureImage = async (miniId: number) => {
  const formData = new FormData()
  formData.append('id', miniId.toString())

  const response = await fetch('/miniatures/phpscripts/deleteImage.php', {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Image delete failed:', errorText)
    throw new Error(errorText || 'Failed to delete image')
  }

  // If delete was successful, update has_image to false
  return await updateHasImage(miniId, false)
}

export async function createMiniature(data: Partial<MiniatureData>) {
  try {
    // First create the miniature without types to get its ID
    const miniatureData = {
      name: data.name,
      description: data.description,
      location: data.location,
      quantity: data.quantity,
      painted_by_id: data.painted_by_id,
      base_size_id: data.base_size_id,
      product_set_id: data.product_set_id,
      material_id: data.material_id
    }

    const { data: newMini, error: miniError } = await supabase
      .from('minis')
      .insert(miniatureData)
      .select()
      .single()

    if (miniError) throw miniError

    // Then create the type relationships with the new mini ID
    if (data.types && data.types.length > 0) {
      const typeRelations = data.types.map((t: MiniatureType) => ({
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
      const tagRelations = data.tags.map((t: MiniatureTag) => ({
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

export async function updateMiniature(miniId: number, data: Partial<MiniatureData>) {
  try {
    // First update the miniature basic data
    const miniatureData = {
      name: data.name,
      description: data.description,
      location: data.location,
      quantity: data.quantity,
      painted_by_id: data.painted_by_id,
      base_size_id: data.base_size_id,
      product_set_id: data.product_set_id,
      material_id: data.material_id
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
      const typeRelations = data.types.map((t: MiniatureType) => ({
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
      const tagRelations = data.tags.map((t: MiniatureTag) => ({
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
    
    const imageResponse = await fetch('/miniatures/phpscripts/deleteImage.php', {
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

export async function getMiniature(id: number) {
  const { data, error } = await supabase
    .from('minis')
    .select(`
      *,
      types:mini_to_types(
        type_id,
        proxy_type,
        type:mini_types(
          id,
          name,
          categories:type_to_categories(
            category:mini_categories(
              id,
              name
            )
          )
        )
      ),
      tags:mini_to_tags(
        tag:tags(
          id,
          name
        )
      ),
      painted_by:painted_by(
        id,
        painted_by_name
      ),
      base_size:base_sizes(
        id,
        base_size_name
      ),
      product_sets:product_sets(
        id,
        name,
        product_line:product_lines(
          id,
          name,
          company:product_companies(
            id,
            name
          )
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function updateMiniatureInUse(miniId: number, inUse: boolean) {
  try {
    const { error } = await supabase
      .from('minis')
      .update({ 
        in_use: inUse ? new Date().toISOString() : null 
      })
      .eq('id', miniId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating miniature in_use status:', error)
    throw error
  }
}

export async function deleteImage(miniId: number) {
  try {
    const formData = new FormData()
    formData.append('id', miniId.toString())
    
    const imageResponse = await fetch('/miniatures/phpscripts/deleteImage.php', {
      method: 'POST',
      body: formData
    })
    
    if (!imageResponse.ok) {
      throw new Error(await imageResponse.text())
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting image:', error)
    throw error
  }
}
 