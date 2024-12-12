import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bgCardBody rounded-md border border-gray-700 ${className}`}>
      {children}
    </div>
  )
} 