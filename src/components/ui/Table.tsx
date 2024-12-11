interface TableHeaderProps {
  title: string
  actionWidth?: string
  className?: string
}

export function TableHeader({ title, actionWidth = "w-20", className = '' }: TableHeaderProps) {
  return (
    <div className={`bgTableHeader p-2 rounded-t flex justify-between items-center mb-1 ${className}`}>
      <div className="font-medium">{title}</div>
      <div className={actionWidth}></div>
    </div>
  )
}

interface TableRowProps {
  title: string
  isSelected?: boolean
  onSelect?: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}

export function TableRow({ 
  title, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete,
  className = '' 
}: TableRowProps) {
  return (
    <div 
      onClick={onSelect}
      className={`flex items-center justify-between p-1 pl-2 pr-2 rounded cursor-pointer ${
        isSelected ? 'bgSelected' : 'bgRow hover:bgRowHover'
      } ${className}`}
    >
      <span>{title}</span>
      <div className="flex gap-1 w-20 justify-end">
        {onEdit && (
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="p-1 rounded hover:bg-gray-600"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 rounded hover:bg-gray-600"
          >
            <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
} 