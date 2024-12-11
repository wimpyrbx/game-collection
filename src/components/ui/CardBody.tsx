import { ReactNode } from 'react'

interface CardBodyProps {
  children: ReactNode
  className?: string
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={`p-4 ${className} bgCardBody`}>
      {children}
    </div>
  )
} 