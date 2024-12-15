import React, { createContext, useContext, useCallback, useState } from 'react'
import { Toast } from '../components/ui/feedback/Toast'

export type NotificationType = 'error' | 'warning' | 'success'

export interface Notification {
  id: number
  message: string
  type: NotificationType
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void
  removeNotification: (id: number) => void
  notifications: Notification[]
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

let notificationId = 0

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const id = notificationId++
    setNotifications(prev => [...prev, { id, message, type }])

    // Auto-remove after 3 seconds
    setTimeout(() => {
      removeNotification(id)
    }, 3000)
  }, [])

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification, notifications }}>
      {children}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2">
        {notifications.map(notification => (
          <Toast
            key={notification.id}
            message={notification.message}
            type={notification.type}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }

  const { addNotification } = context

  return {
    showSuccess: (message: string) => addNotification(message, 'success'),
    showError: (message: string) => addNotification(message, 'error'),
    showWarning: (message: string) => addNotification(message, 'warning')
  }
} 