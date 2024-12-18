import { ReactNode, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

export interface ModalProps {
  children: ReactNode
  onClose: () => void
  isOpen: boolean
  className?: string
}

export function Modal({ children, onClose, isOpen, className }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleEscapeKey, true)
    return () => window.removeEventListener('keydown', handleEscapeKey, true)
  }, [handleEscapeKey])

  const modalRoot = document.getElementById('modal-root')
  if (!modalRoot) return null

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div 
          ref={modalRef}
          className="fixed inset-0 pointer-events-auto"
          style={{ zIndex: 9999 }}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          
          {/* Modal container */}
          <div className="fixed inset-0 overflow-y-auto">
            <div 
              className="min-h-full flex items-center justify-center p-4"
              onClick={onClose}
            >
              {/* Modal content */}
              <motion.div 
                className={`relative bg-gray-900 rounded-lg border border-gray-800 shadow-xl ${className ? className : 'w-full max-w-2xl'}`}
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ 
                  duration: 0.2,
                  ease: "easeOut"
                }}
              >
                {children}
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    modalRoot
  )
}

interface ModalHeaderProps {
  children: ReactNode
  className?: string
}

export function ModalHeader({ children, className = '' }: ModalHeaderProps) {
  return (
    <div className={`p-4 bg-gray-800/50 border-b border-gray-700 rounded-t-lg ${className}`}>
      {children}
    </div>
  )
}

interface ModalBodyProps {
  children: ReactNode
  className?: string
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return (
    <div className={`p-4 bg-gray-900 overflow-y-auto ${className}`}>
      {children}
    </div>
  )
}

interface ModalFooterProps {
  children: ReactNode
  className?: string
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <div className={`p-4 bg-gray-800/50 border-t border-gray-700 rounded-b-lg ${className}`}>
      {children}
    </div>
  )
} 