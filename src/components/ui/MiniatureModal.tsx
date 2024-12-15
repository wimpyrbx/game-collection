import React from 'react'
import * as UI from '.'
import type { Mini } from '../../types/mini'

interface MiniatureModalProps {
  isOpen: boolean
  onClose: () => void
  mini?: Mini
}

export function MiniatureModal({ isOpen, onClose, mini }: MiniatureModalProps) {
  const isEditMode = !!mini

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement form submission
  }

  return (
    <UI.Modal
      isOpen={isOpen}
      onClose={onClose}
    >
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
              defaultValue={mini?.name}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <UI.Button
            type="button"
            variant="btnWarning"
            onClick={onClose}
          >
            Cancel
          </UI.Button>
          <UI.Button
            type="submit"
            variant="btnPrimary"
          >
            {isEditMode ? 'Save Changes' : 'Add Miniature'}
          </UI.Button>
        </div>
      </form>
    </UI.Modal>
  )
} 