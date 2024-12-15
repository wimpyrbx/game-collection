import React from 'react'
import * as UI from '../ui'
import type { Mini } from '../../types/mini'

interface MiniatureOverviewModalProps {
  isOpen: boolean
  onClose: () => void
  mini?: Mini // Optional for edit mode
  onSave: (data: Partial<Mini>) => Promise<void>
}

export function MiniatureOverviewModal({ isOpen, onClose, mini, onSave }: MiniatureOverviewModalProps) {
  const isEditMode = !!mini

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement form submission
  }

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          {isEditMode ? 'Edit Miniature' : 'Add New Miniature'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Form fields will go here */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Name
              </label>
              <UI.Input
                type="text"
                placeholder="Enter miniature name"
                value={mini?.name}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <UI.Button
              type="button"
              variant="btnPrimary"
              onClick={onClose}
            >
              Cancel
            </UI.Button>
            <UI.Button
              type="submit"
              variant="btnSuccess"
            >
              {isEditMode ? 'Save Changes' : 'Add Miniature'}
            </UI.Button>
          </div>
        </form>
      </div>
    </UI.Modal>
  )
} 