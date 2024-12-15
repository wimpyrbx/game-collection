import { ReactNode } from 'react'

interface EmptyTableStateProps {
  icon: ReactNode
  message: string
  className?: string
}

export function EmptyTableState({ icon, message, className = '' }: EmptyTableStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="text-gray-500 text-4xl mb-4">
        {icon}
      </div>
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  )
} 