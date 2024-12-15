import React, { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 bg-gray-800 rounded border ${
            error ? 'border-red-500' : 'border-gray-700'
          } focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none ${className}`}
          {...props}
        />
        {error && (
          <div className="text-sm text-red-500 mt-1">{error}</div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input' 