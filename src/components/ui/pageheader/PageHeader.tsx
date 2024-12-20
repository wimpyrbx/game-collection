import React, { ReactNode } from 'react'
import { IconType } from 'react-icons'

interface PageHeaderProps {
  children: ReactNode
  className?: string
  bgColor?: string
  gradientColor?: string
}

export function PageHeader({ 
  children, 
  className = '', 
  bgColor = 'bg-cyan-900',
  gradientColor
}: PageHeaderProps) {
  const backgroundClass = gradientColor 
    ? `bg-gradient-to-r from-${bgColor.replace('bg-', '')} to-${gradientColor.replace('to-', '')}`
    : bgColor

  // Split children into BigNumbers and other content
  const childrenArray = React.Children.toArray(children)
  const bigNumbers = childrenArray.filter(child => 
    React.isValidElement(child) && child.type === PageHeaderBigNumber
  )
  const otherContent = childrenArray.filter(child => 
    !React.isValidElement(child) || child.type !== PageHeaderBigNumber
  )

  return (
    <div className={`flex items-center gap-2 mb-6 mt-0 px-6 py-0 pl-0 pr-0 pb-0 ${backgroundClass} rounded-lg ${className}`}>
      <div className="flex items-center gap-2">
        {otherContent}
      </div>
      {bigNumbers.length > 0 && (
        <div className="ml-auto flex gap-2">
          {bigNumbers}
        </div>
      )}
    </div>
  )
}

interface PageHeaderIconProps {
  icon: IconType
  className?: string
  bgClassName?: string
}

export function PageHeaderIcon({ 
  icon: Icon, 
  className = 'text-gray-800',
  bgClassName = ''
}: PageHeaderIconProps) {
  return (
    <div className={`flex items-center justify-center w-20 h-20 rounded-lg ${bgClassName}`}>
      <Icon className={`w-12 h-12 ${className}`} />
    </div>
  )
}

interface PageHeaderTextProps {
  children: ReactNode
  className?: string
}

export function PageHeaderText({ children, className = '' }: PageHeaderTextProps) {
  return <h1 className={`text-2xl font-bold mb-1 text-white ${className}`}>{children}</h1>
}

interface PageHeaderTextGroupProps {
  children: ReactNode
  className?: string
}

export function PageHeaderTextGroup({ children, className = '' }: PageHeaderTextGroupProps) {
  return <div className={`flex flex-col ${className}`}>{children}</div>
}

interface PageHeaderSubTextProps {
  children: ReactNode
  className?: string
}

export function PageHeaderSubText({ children, className = '' }: PageHeaderSubTextProps) {
  return <span className={`text-sm text-gray-200 ${className}`}>{children}</span>
}

interface PageHeaderBigNumberProps {
  icon: IconType
  number: number | string
  text: string
  className?: string
  iconClassName?: string
}

export function PageHeaderBigNumber({ 
  icon: Icon,
  number,
  text,
  className = '',
  iconClassName = 'text-gray-200'
}: PageHeaderBigNumberProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2 bg-white/10 rounded-lg ${className}`}>
      <Icon className={`w-8 h-8 ${iconClassName}`} />
      <div className="flex flex-col min-w-[100px]">
        <span className="text-sm text-gray-300 text-right font-bold italic">{text}</span>
        <span className="text-2xl font-bold text-white text-right">{number}</span>
      </div>
    </div>
  )
} 