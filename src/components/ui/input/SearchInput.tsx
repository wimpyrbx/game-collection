import { forwardRef } from 'react'

interface SearchInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  rightElement?: React.ReactNode
  onFocus?: () => void
  onClear?: () => void
  showClearButton?: boolean
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({ 
  value, 
  onChange, 
  placeholder, 
  className = '', 
  rightElement,
  onFocus,
  onClear,
  showClearButton
}, ref) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          placeholder={placeholder}
          className={`w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none ${className}`}
          ref={ref}
        />
        {showClearButton && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {rightElement}
    </div>
  )
}) 