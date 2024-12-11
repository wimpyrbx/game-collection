import { useState } from 'react'
import { useProductAdmin } from '../hooks/useProductAdmin'
import type { ProductGroup, ProductType } from '../hooks/useProductAdmin'
import { ProductForm } from '../components/admin/ProductForm'
import { ProductListItem } from '../components/admin/ProductListItem'

export default function Admin() {
  const [newGroup, setNewGroup] = useState({ name: '', description: '' })
  const [newType, setNewType] = useState({ name: '', description: '' })
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null)
  const [editingType, setEditingType] = useState<ProductType | null>(null)

  const { 
    productGroups, 
    productTypes, 
    error,
    addProductGroup,
    addProductType,
    deleteGroup,
    deleteType,
    updateGroup,
    updateType 
  } = useProductAdmin()

  const handleAddGroup = async () => {
    const result = await addProductGroup(newGroup.name, newGroup.description)
    if (!result?.error) {
      setNewGroup({ name: '', description: '' })
    }
  }

  const handleAddType = async () => {
    const result = await addProductType(newType.name, newType.description)
    if (!result?.error) {
      setNewType({ name: '', description: '' })
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-500 text-white p-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <h2 className="text-xl font-bold mb-4">Product Groups</h2>
        <ProductForm
          name={newGroup.name}
          description={newGroup.description}
          onNameChange={(name) => setNewGroup({ ...newGroup, name })}
          onDescriptionChange={(description) => setNewGroup({ ...newGroup, description })}
          onSubmit={handleAddGroup}
          submitLabel="Add"
        />
        <div className="space-y-2">
          {productGroups.map(group => (
            <ProductListItem
              key={group.id}
              id={group.id}
              name={group.name}
              description={group.description}
              isEditing={editingGroup?.id === group.id}
              editingName={editingGroup?.name || ''}
              editingDescription={editingGroup?.description || ''}
              onEdit={() => setEditingGroup(group)}
              onDelete={() => deleteGroup(group.id)}
              onSave={async () => {
                if (editingGroup) {
                  const result = await updateGroup(group.id, editingGroup)
                  if (!result?.error) {
                    setEditingGroup(null)  // Only close if update was successful
                  }
                }
              }}
              onCancel={() => setEditingGroup(null)}
              onNameChange={(name) => editingGroup && setEditingGroup({ ...editingGroup, name })}
              onDescriptionChange={(description) => editingGroup && setEditingGroup({ ...editingGroup, description })}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Product Types</h2>
        <ProductForm
          name={newType.name}
          description={newType.description}
          onNameChange={(name) => setNewType({ ...newType, name })}
          onDescriptionChange={(description) => setNewType({ ...newType, description })}
          onSubmit={handleAddType}
          submitLabel="Add"
        />
        <div className="space-y-2">
          {productTypes.map(type => (
            <ProductListItem
              key={type.id}
              id={type.id}
              name={type.name}
              description={type.description}
              isEditing={editingType?.id === type.id}
              editingName={editingType?.name || ''}
              editingDescription={editingType?.description || ''}
              onEdit={() => setEditingType(type)}
              onDelete={() => deleteType(type.id)}
              onSave={async () => {
                if (editingType) {
                  const result = await updateType(type.id, editingType)
                  if (!result?.error) {
                    setEditingType(null)  // Only close if update was successful
                  }
                }
              }}
              onCancel={() => setEditingType(null)}
              onNameChange={(name) => editingType && setEditingType({ ...editingType, name })}
              onDescriptionChange={(description) => editingType && setEditingType({ ...editingType, description })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
