interface ProductItemProps {
  id: number
  name: string
  description: string | null
  isEditing: boolean
  editingName: string
  editingDescription: string
  onEdit: () => void
  onDelete: () => void
  onSave: () => void
  onCancel: () => void
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
}

export function ProductListItem({
  name,
  description,
  isEditing,
  editingName,
  editingDescription,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  onNameChange,
  onDescriptionChange
}: ProductItemProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 bg-gray-800 p-2 rounded">
        <input
          type="text"
          className="bg-gray-700 p-2 rounded"
          value={editingName}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <input
          type="text"
          className="bg-gray-700 p-2 rounded"
          value={editingDescription || ''}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
        <button 
          onClick={onSave}
          className="bg-green-500 px-4 py-2 rounded hover:bg-green-600"
        >
          Save
        </button>
        <button 
          onClick={onCancel}
          className="bg-gray-500 px-4 py-2 rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-gray-800 p-2 rounded">
      <span>
        {name} {description && `- ${description}`}
      </span>
      <button 
        onClick={onEdit}
        className="bg-yellow-500 px-4 py-2 rounded hover:bg-yellow-600"
      >
        Edit
      </button>
      <button 
        onClick={onDelete}
        className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
      >
        Delete
      </button>
    </div>
  )
}
