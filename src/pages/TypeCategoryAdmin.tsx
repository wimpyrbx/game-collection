import { useState } from 'react'
import { useTypeCategoryAdmin } from '../hooks/useTypeCategoryAdmin'
import type { MiniType } from '../lib/supabase'
import { AddTypeModal } from '../components/AddTypeModal'
import { EditTypeModal } from '../components/EditTypeModal'
import { ManageCategoriesModal } from '../components/ManageCategoriesModal'
import { supabase } from '../lib/supabase'

export default function TypeCategoryAdmin() {
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false)
  const [typeToEdit, setTypeToEdit] = useState<MiniType | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [searchType, setSearchType] = useState('')
  const [selectedType, setSelectedType] = useState<MiniType | null>(null)
  const [inUseOnly, setInUseOnly] = useState(false)
  
  const {
    miniTypes,
    categories,
    selectedTypeCategories,
    error,
    addType,
    editType,
    deleteType,
    loadTypeCategoryIds,
    updateTypeCategories
  } = useTypeCategoryAdmin()

  const handleTypeSelect = async (type: MiniType) => {
    setSelectedType(type)
    await loadTypeCategoryIds(type.id)
  }

  const filteredTypes = miniTypes
    .filter(type => 
      type.name.toLowerCase().includes(searchType.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name))

  const getTypeCategoryCount = (typeId: number): number => {
    return selectedType?.id === typeId 
      ? selectedTypeCategories.length 
      : 0 // Default to 0 for now, adjust as needed
  }

  return (
    <div className="flex gap-6">
      {/* Left Column - Types */}
      <div className="flex-1">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Character Types</h2>
          <div className="text-sm text-gray-400">
            Select a character type to set category relationship(s).
          </div>
          <div className="text-sm italic text-gray-500">
            * Each type can have 0 or any number of categories assigned
          </div>
        </div>

        {/* Table Header */}
        <div className="bg-gray-700 p-2 rounded-t flex justify-between items-center mb-1">
          <div className="font-medium">Type Name</div>
          <div className="w-20"></div> {/* Space for action buttons */}
        </div>

        {/* Table Content */}
        <div className="space-y-1">
          {filteredTypes.map(type => (
            <div 
              key={type.id}
              onClick={() => handleTypeSelect(type)}
              className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                selectedType?.id === type.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{type.name}</span>
              </div>
              <div className="flex gap-1 w-20 justify-end">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setTypeToEdit(type);
                  }}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteType(type.id);
                  }}
                  className="p-1 rounded hover:bg-gray-600"
                >
                  <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column - Categories */}
      <div className="flex-1">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Categories</h2>
          <div className="text-sm text-gray-400">
            Selected type: <strong>{selectedType?.name || 'None'}</strong>
          </div>
          <div className="text-sm italic text-gray-500">
            {!selectedType 
              ? '* Please select a type to manage its category relationship(s).'
              : selectedTypeCategories.length === 0
                ? '* There is no category relationship setup yet'
                : `This type has ${selectedTypeCategories.length} category ${
                    selectedTypeCategories.length === 1 ? 'relationship' : 'relationships'
                  }.`}
          </div>
        </div>

        {/* Table Header */}
        <div className="bg-gray-700 p-2 rounded-t flex justify-between items-center mb-1">
          <div className="font-medium">Category Name</div>
          <div className="w-10"></div> {/* Space for action buttons */}
        </div>

        {/* Table Content */}
        {selectedType && (
          <div className="space-y-1">
            {categories
              .filter(cat => selectedTypeCategories.includes(cat.id))
              .map(category => (
                <div 
                  key={category.id}
                  className="bg-gray-800 p-2 rounded flex justify-between items-center"
                >
                  <span>{category.name}</span>
                  <div className="w-10"></div>
                </div>
              ))}
          </div>
        )}
      </div>

      <AddTypeModal
        isOpen={isAddTypeModalOpen}
        onClose={() => setIsAddTypeModalOpen(false)}
        onAdd={addType}
      />

      <EditTypeModal
        type={typeToEdit}
        isOpen={typeToEdit !== null}
        onClose={() => setTypeToEdit(null)}
        onEdit={editType}
      />

      <ManageCategoriesModal
        type={selectedType}
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        selectedCategoryIds={selectedTypeCategories}
        onSave={(categoryIds) => updateTypeCategories(selectedType?.id || 0, categoryIds)}
      />

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
} 