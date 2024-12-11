interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded ${
        variant === 'primary' ? 'bg-blue-600 hover:bg-blue-700' :
        variant === 'secondary' ? 'bg-gray-600 hover:bg-gray-700' :
        'bg-red-600 hover:bg-red-700'
      } ${className}`}
    />
  )
}