import { FastifyInstance } from 'fastify'
import { supabase } from '../../lib/supabase'

export async function minisRoutes(app: FastifyInstance) {
  // List minis with pagination and search
  app.get('/api/minis/list', async (request, reply) => {
    try {
      const { offset = 0, limit = 10, search = '' } = request.query as any
      
      console.log('Fetching minis:', { offset, limit, search })
      
      let query = supabase
        .from('minis')
        .select(`
          *,
          types:mini_to_types(
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
          painted_by(id, painted_by_name),
          base_size(id, base_size_name),
          product_set(
            id,
            name,
            product_line(
              id,
              name,
              company:product_companies(
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
          product_set.name.ilike.%${search}%,
          product_set.product_line.name.ilike.%${search}%,
          product_set.product_line.company.name.ilike.%${search}%
        `)
      }
      
      const { data: items, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('name')

      if (error) {
        throw error
      }

      return reply.send({
        items,
        total: count
      })
    } catch (error) {
      console.error('Error loading minis:', error)
      return reply.status(500).send({
        error: true,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    }
  })

  // Add new mini
  app.post('/api/minis/add', async (request, reply) => {
    try {
      const mini = request.body as any
      
      // Insert mini
      const { data: newMini, error: miniError } = await supabase
        .from('minis')
        .insert({
          name: mini.name,
          painted_by_id: mini.painted_by_id,
          base_size_id: mini.base_size_id,
          product_set_id: mini.product_set_id
        })
        .select()
        .single()

      if (miniError) throw miniError

      // Insert types
      if (mini.types && mini.types.length > 0) {
        const { error: typesError } = await supabase
          .from('mini_to_types')
          .insert(
            mini.types.map((typeId: number) => ({
              mini_id: newMini.id,
              type_id: typeId
            }))
          )

        if (typesError) throw typesError
      }

      return reply.send({ id: newMini.id })
    } catch (error) {
      console.error('Error adding mini:', error)
      return reply.status(500).send({
        error: true,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    }
  })

  // Edit existing mini
  app.put('/api/minis/edit/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const mini = request.body as any

      // Update mini
      const { error: miniError } = await supabase
        .from('minis')
        .update({
          name: mini.name,
          painted_by_id: mini.painted_by_id,
          base_size_id: mini.base_size_id,
          product_set_id: mini.product_set_id
        })
        .eq('id', id)

      if (miniError) throw miniError

      // Update types if provided
      if (mini.types !== undefined) {
        // Delete existing types
        const { error: deleteError } = await supabase
          .from('mini_to_types')
          .delete()
          .eq('mini_id', id)

        if (deleteError) throw deleteError

        // Insert new types
        if (mini.types && mini.types.length > 0) {
          const { error: typesError } = await supabase
            .from('mini_to_types')
            .insert(
              mini.types.map((typeId: number) => ({
                mini_id: id,
                type_id: typeId
              }))
            )

          if (typesError) throw typesError
        }
      }

      return reply.send({ success: true })
    } catch (error) {
      console.error('Error updating mini:', error)
      return reply.status(500).send({
        error: true,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    }
  })

  // Delete mini
  app.delete('/api/minis/delete/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

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

      return reply.send({ success: true })
    } catch (error) {
      console.error('Error deleting mini:', error)
      return reply.status(500).send({
        error: true,
        message: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    }
  })
} 