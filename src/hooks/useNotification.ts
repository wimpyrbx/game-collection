import { useState } from 'react'

interface NotificationState {
  message: string
  type: 'error' | 'warning' | 'success'
  isVisible: boolean
}

export function useNotification() {
  const [notification, setNotification] = useState<NotificationState>({
    message: '',
    type: 'success',
    isVisible: false
  })

  const showNotification = (message: string, type: 'error' | 'warning' | 'success') => {
    setNotification({
      message,
      type,
      isVisible: true
    })

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, isVisible: false }))
    }, 3000)
  }

  const showSuccess = (message: string) => {
    showNotification(message, 'success')
  }

  const showError = (message: string) => {
    showNotification(message, 'error')
  }

  const showWarning = (message: string) => {
    showNotification(message, 'warning')
  }

  return {
    notification,
    showSuccess,
    showError,
    showWarning
  }
} 