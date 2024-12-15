import { ReactNode } from 'react'

export interface ModalProps {
  children: ReactNode
  onClose: () => void
  isOpen: boolean
  className?: string
}

export function Modal({ children, onClose, isOpen, className }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className={`relative w-full ${className || 'max-w-2xl'} rounded-lg bg-gray-800 p-6 pt-1 pb-1 shadow-xl`}>
        {children}
      </div>
    </div>
  )
} 