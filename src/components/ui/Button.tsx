interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  variant?: 'btnSuccess' | 'btnDanger' | 'btnWarning' | 'btnPrimary'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

export function Button({ 
  children, 
  onClick, 
  variant = 'btnPrimary',
  size = 'sm',
  disabled = false,
  className = ''
}: ButtonProps) {
  const variants = {
    btnSuccess: 'btnSuccess',
    btnDanger: 'btnDanger',
    btnWarning: 'btnWarning',
    btnPrimary: 'btnPrimary',
  }

  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  )
} 