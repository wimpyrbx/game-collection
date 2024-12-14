interface SearchInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  rightElement?: React.ReactNode
}

export function SearchInput({ value, onChange, placeholder, className = '', rightElement }: SearchInputProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none ${className}`}
      />
      {rightElement}
    </div>
  )
} 