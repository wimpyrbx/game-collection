interface InputProps {
  label?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  className?: string
  required?: boolean
  autoFocus?: boolean
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  required,
  autoFocus
}: InputProps) {
  return (
    <div className="flex items-center gap-4">
      {label && (
        <label className="text-sm font-medium w-32 text-gray-400">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className={`flex-1 px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none ${className}`}
      />
    </div>
  )
} 