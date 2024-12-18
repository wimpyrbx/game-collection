interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helper?: string
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  required,
  autoFocus,
}: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-1">
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
        className={`h-10 w-full px-3 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none ${className}`}
      />
    </div>
  )
} 