import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bgCardBody rounded-md border shadow-md border-gray-700 ${className}`}>
      {children}
    </div>
  )
} 