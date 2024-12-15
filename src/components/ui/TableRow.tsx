import { FaEdit, FaTrash } from 'react-icons/fa'

interface TableRowProps {
  title: string
  isSelected?: boolean
  onSelect?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function TableRow({
  title,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete
}: TableRowProps) {
  return (
    <div
      className={`flex items-center justify-between py-2 px-4 cursor-pointer hover:bgRowHover transition-colors ${
        isSelected ? 'bgSelected' : 'bgRow'
      }`}
      onClick={onSelect}
    >
      <div className="text-gray-300 text-sm">{title}</div>
      <div className="flex gap-1">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="text-blue-400 hover:text-blue-300"
          >
            <FaEdit className="w-3 h-3" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-red-400 hover:text-red-300"
          >
            <FaTrash className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
} 