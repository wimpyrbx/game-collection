import { FaExclamationCircle, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa'
import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'error' | 'warning' | 'success'
}

export function Toast({ message, type = 'error' }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Start fade out animation after 2.7s (total duration 3s with 0.3s animation)
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 2700)

    return () => clearTimeout(timer)
  }, [])

  const bgColor = {
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    success: 'bg-green-500'
  }[type]

  const icon = {
    error: <FaExclamationCircle className="h-5 w-5 text-red-200" />,
    warning: <FaExclamationTriangle className="h-5 w-5 text-yellow-200" />,
    success: <FaCheckCircle className="h-5 w-5 text-green-200" />
  }[type]

  return (
    <div 
      className={`
        ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg
        flex items-center gap-3 min-w-[300px] max-w-[500px]
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}
      `}
    >
      {icon}
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
} 