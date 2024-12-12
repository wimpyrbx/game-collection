import { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ isOpen, onClose, children, footer }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal content */}
        <div className="relative z-50 w-full max-w-2xl">
          <div className="bg-gray-900 rounded-lg border border-gray-800">
            {children}

            {/* Footer */}
            {footer && (
              <div className="bg-gray-800 px-6 py-4 rounded-b-lg border-t border-gray-700">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 