import { ReactNode } from 'react'

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

interface CardIconProps {
  size?: 'small' | 'big'
  children: ReactNode
  className?: string
}

export function CardIcon({ size = 'small', children, className = '' }: CardIconProps) {
  const sizeClasses = {
    small: '[&>svg]:w-5 [&>svg]:h-5 mr-2 mt-1',
    big: '[&>svg]:w-16 [&>svg]:h-16 mr-4 mt-1'
  }

  return (
    <div className={`text-gray-400 ${sizeClasses[size]} ${className}`}>
      {children}
    </div>
  )
}

export default function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`p-4 border-b border-gray-700 ${className} bgCardHeader`}>
      <div className="flex justify-between items-start">
        {children}
      </div>
    </div>
  )
}

export function CardHeaderText({ children }: { children: ReactNode }) {
  return <h2 className="text-xl font-bold text-gray-100 flex items-center">{children}</h2>
}

export function CardHeaderSubText({ children }: { children: ReactNode }) {
  return <div className="text-sm text-gray-400">{children}</div>
}

export function CardHeaderItalicText({ children }: { children: ReactNode }) {
  return <div className="text-sm italic text-gray-500">{children}</div>
}

export function CardHeaderRightSide({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 ml-4 self-start">{children}</div>
} 