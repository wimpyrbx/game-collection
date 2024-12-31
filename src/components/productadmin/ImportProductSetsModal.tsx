import { useState } from 'react'
import * as UI from '../ui'
import { supabase } from '../../lib/supabase'
import { FaFileImport } from 'react-icons/fa'
import { useProductAdmin } from '../../hooks/useProductAdmin'

interface ImportProductSetsModalProps {
  isOpen: boolean
  onClose: () => void
  productLineId: number
  onSuccess: () => void
}

export function ImportProductSetsModal({ isOpen, onClose, productLineId, onSuccess }: ImportProductSetsModalProps) {
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { invalidateCache } = useProductAdmin()

  const handleImport = async () => {
    if (!text.trim()) return
    setIsLoading(true)

    try {
      // Split text into lines and filter out empty lines
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean)

      // Create array of product sets
      const productSets = lines.map(name => ({
        name,
        product_line_id: productLineId
      }))

      // Insert product sets with ON CONFLICT DO NOTHING
      const { error } = await supabase
        .from('product_sets')
        .upsert(productSets, { 
          onConflict: 'name,product_line_id',
          ignoreDuplicates: true 
        })

      if (error) throw error

      // Invalidate the cache before calling onSuccess
      invalidateCache()
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error importing product sets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); handleImport(); }}>
        <UI.ModalHeader>
          <div className="flex items-center gap-3">
            <div className="text-xl text-blue-600">
              <FaFileImport />
            </div>
            <h2 className="text-xl font-semibold">
              Import Product Sets
            </h2>
          </div>
        </UI.ModalHeader>

        <UI.ModalBody>
          <UI.TextArea
            label="Enter product set names (one per line)"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Enter product set names..."
            rows={10}
          />
        </UI.ModalBody>

        <UI.ModalFooter>
          <div className="flex justify-end gap-2">
            <UI.Button
              variant="btnPrimary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </UI.Button>
            <UI.Button
              variant="btnSuccess"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Importing...' : 'Import Sets'}
            </UI.Button>
          </div>
        </UI.ModalFooter>
      </form>
    </UI.Modal>
  )
} 