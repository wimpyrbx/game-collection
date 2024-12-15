import React from 'react'

interface Option {
  value: string
  label: string
}

interface MultiSelectProps {
  label?: string
  value: string[]
  onChange: (value: string[]) => void
  options: Option[]
}

export function MultiSelect({ label, value, onChange, options }: MultiSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value)
    onChange(selectedOptions)
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
      <select
        multiple
        value={value}
        onChange={handleChange}
        className="mt-1 block w-full rounded-md border-gray-700 bg-gray-800 text-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 min-h-[120px]"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
} 