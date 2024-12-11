import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-gray-900 rounded-md border border-gray-700 ${className}`}>
      {children}
    </div>
  )
} 