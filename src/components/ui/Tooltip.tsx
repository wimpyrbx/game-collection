interface TooltipProps {
  children: React.ReactNode
  className?: string
}

export function Tooltip({ children, className = '' }: TooltipProps) {
  return (
    <div 
      className={`
        absolute z-50 
        bg-gray-800 
        border border-gray-700 
        rounded-md 
        shadow-lg 
        p-2 
        mt-1
        left-6
        top-0
        ${className}
      `}
    >
      {children}
    </div>
  )
} 