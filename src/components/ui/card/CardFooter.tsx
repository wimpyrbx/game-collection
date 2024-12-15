import { ReactNode } from 'react'

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export default function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`px-4 py-3 border-t border-gray-700 ${className}`}>
      {children}
    </div>
  )
} 