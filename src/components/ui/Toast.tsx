import { FaExclamationCircle, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa'
import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'error' | 'warning' | 'success'
  duration?: number // duration in seconds
}

export function Toast({ message, type = 'error', duration = 2 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [shouldRender, setShouldRender] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, duration * 1000)

    return () => clearTimeout(timer)
  }, [duration])

  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300) // match this with transition duration

      return () => clearTimeout(timer)
    }
  }, [isVisible])

  if (!shouldRender) return null

  const bgColor = {
    error: 'bg-red-500',
    warning: 'bg-red-900',
    success: 'bg-green-500'
  }[type]

  const icon = {
    error: <FaExclamationCircle className="h-5 w-5 text-red-200" />,
    warning: <FaExclamationTriangle className="h-5 w-5 text-yellow-200" />,
    success: <FaCheckCircle className="h-5 w-5 text-green-200" />
  }[type]

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]">
      <div 
        className={`
          ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg border border-red-950 
          flex items-center gap-3 transition-opacity duration-300
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
      >
        {icon}
        <span>{message}</span>
      </div>
    </div>
  )
} 