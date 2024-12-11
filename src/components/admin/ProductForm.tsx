interface ProductFormProps {
  name: string
  description: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onSubmit: () => void
  submitLabel: string
}

export function ProductForm({ 
  name, 
  description, 
  onNameChange, 
  onDescriptionChange, 
  onSubmit,
  submitLabel 
}: ProductFormProps) {
  return (
    <div className="flex gap-2 mb-4">
      <input
        type="text"
        placeholder="Name"
        className="bg-gray-700 p-2 rounded"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
      />
      <input
        type="text"
        placeholder="Description"
        className="bg-gray-700 p-2 rounded"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
      />
      <button 
        onClick={onSubmit}
        className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
      >
        {submitLabel}
      </button>
    </div>
  )
}
