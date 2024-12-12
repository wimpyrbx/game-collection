import { Modal } from './Modal'
import { Input } from './Input'
import { TextArea } from './TextArea'
import { Button } from './Button'
import { ReactNode, useState } from 'react'
import { IconType } from 'react-icons'

interface Field {
  name: string
  label: string
  type: 'input' | 'textarea'
  placeholder?: string
  initialValue?: string
}

interface ModalLayoutProps {
  isOpen: boolean
  onClose: () => void
  title: string
  icon?: IconType
  iconColor?: string
  fields?: Field[]
  onSubmit?: (values: Record<string, string>) => Promise<void>
  submitLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  children?: ReactNode
  customFooter?: ReactNode
}

export function ModalLayout({
  isOpen,
  onClose,
  title,
  icon: Icon,
  iconColor = 'text-blue-600',
  fields = [],
  onSubmit,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  isLoading = false,
  children,
  customFooter
}: ModalLayoutProps) {
  const [values, setValues] = useState<Record<string, string>>(() => 
    fields.reduce((acc, field) => ({
      ...acc,
      [field.name]: field.initialValue || ''
    }), {})
  )

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit(values)
      // Reset form
      setValues(fields.reduce((acc, field) => ({
        ...acc,
        [field.name]: ''
      }), {}))
    }
  }

  const handleClose = () => {
    // Reset form
    setValues(fields.reduce((acc, field) => ({
      ...acc,
      [field.name]: ''
    }), {}))
    onClose()
  }

  const isValid = fields.every(field => values[field.name].trim())

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`text-xl ${iconColor}`}>
              <Icon />
            </div>
          )}
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>

        {/* Body */}
        <div className="py-2 space-y-4">
          {fields.map(field => (
            <div key={field.name}>
              {field.type === 'input' ? (
                <Input
                  label={field.label}
                  value={values[field.name]}
                  onChange={(e) => setValues(prev => ({
                    ...prev,
                    [field.name]: e.target.value
                  }))}
                  placeholder={field.placeholder}
                />
              ) : (
                <TextArea
                  label={field.label}
                  value={values[field.name]}
                  onChange={(e) => setValues(prev => ({
                    ...prev,
                    [field.name]: e.target.value
                  }))}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
          {children}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          {customFooter || (
            <>
              <Button
                variant="btnSecondary"
                onClick={handleClose}
              >
                {cancelLabel}
              </Button>
              <Button
                variant="btnPrimary"
                onClick={handleSubmit}
                disabled={!isValid || isLoading}
              >
                {isLoading ? 'Loading...' : submitLabel}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
} 