import { ReactNode } from 'react'

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`p-4 border-t border-gray-800 ${className}`}>
      {children}
    </div>
  )
} 