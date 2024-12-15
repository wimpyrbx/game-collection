import { useState, useEffect, useMemo, useRef } from 'react'
import { Input } from '../ui/Input'
import * as UI from '../ui'
import { FaDiceD6, FaImage, FaTimesCircle, FaDiceD20, FaTrash } from 'react-icons/fa'
import type { Mini } from '../../types/mini'
import { useMiniatureReferenceData } from '../../hooks/useMiniatureReferenceData'
import { getMiniImagePath } from '../../utils/imageUtils'
import { createMiniature, updateMiniature } from '../../services/miniatureService'
import { useNotifications } from '../../contexts/NotificationContext'

interface MiniatureOverviewModalProps {
  isOpen: boolean
  onClose: () => void
  mini?: Mini
  onSave: (data: Partial<Mini>) => Promise<void>
  onDelete?: (miniId: number) => Promise<void>
  isLoading?: boolean
}

interface SelectedType {
  id: number
  name: string
  proxy_type: boolean
}

// Add new interface for validation errors
interface ValidationErrors {
  name?: string
  location?: string
  base_size_id?: string
  painted_by_id?: string
  quantity?: string
}

export function MiniatureOverviewModal({ 
  isOpen, 
  onClose, 
  mini, 
  onSave,
  onDelete,
  isLoading 
}: MiniatureOverviewModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    quantity: 1,
    painted_by_id: 0,
    base_size_id: 0,
    product_set_id: null as number | null,
    types: [] as { id: number, proxy_type: boolean }[]
  })

  // State for selected types table
  const [selectedTypes, setSelectedTypes] = useState<SelectedType[]>([])
  const [typeSearchTerm, setTypeSearchTerm] = useState('')
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)

  // State for product set search
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  // State for drag & drop
  const [, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const {
    loading: loadingRef,
    error: errorRef,
    paintedByOptions,
    baseSizeOptions,
    companies,
    miniTypes,
    getProductLinesByCompany,
    getProductSetsByProductLine
  } = useMiniatureReferenceData()

  const isEditMode = !!mini

  // Add ref for type search input
  const typeSearchInputRef = useRef<HTMLInputElement>(null)

  // Add new state for validation errors
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  // Add refs for each required field
  const nameInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const baseSizeSelectRef = useRef<HTMLSelectElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)

  const { showError } = useNotifications()

  // Add validation function
  const validateForm = () => {
    const errors: ValidationErrors = {}
    let isValid = true

    if (!formData.name.trim()) {
      errors.name = 'Name is required'
      nameInputRef.current?.focus()
      isValid = false
    }

    if (!formData.location.trim()) {
      errors.location = 'Location is required'
      if (isValid) locationInputRef.current?.focus()
      isValid = false
    }

    if (!formData.base_size_id) {
      errors.base_size_id = 'Base size is required'
      if (isValid) baseSizeSelectRef.current?.focus()
      isValid = false
    }

    if (!formData.painted_by_id) {
      errors.painted_by_id = 'Painted by is required'
      isValid = false
    }

    if (!formData.quantity || formData.quantity < 1) {
      errors.quantity = 'Quantity must be at least 1'
      if (isValid) quantityInputRef.current?.focus()
      isValid = false
    }

    setValidationErrors(errors)
    return isValid
  }

  useEffect(() => {
    if (mini) {
      // Set form data
      const formDataToSet = {
        name: mini.name,
        description: mini.description || '',
        location: mini.location || '',
        quantity: mini.quantity || 1,
        painted_by_id: mini.painted_by?.id || 0,
        base_size_id: mini.base_size?.id || 0,
        product_set_id: mini.product_sets?.[0]?.id || null,
        types: mini.types?.map(t => ({
          id: t.id,
          proxy_type: t.proxy_type
        })) || []
      }
      setFormData(formDataToSet)

      // Set selected types with their names and categories
      const types = mini.types?.map(t => ({
        id: t.type.id,
        name: t.type.name,
        proxy_type: t.proxy_type
      })) || []
      setSelectedTypes(types)

      // Set product search term if product set exists
      if (mini.product_set) {
        const productSetName = `${mini.product_set.product_line.company.name} → ${mini.product_set.product_line.name} → ${mini.product_set.name}`
        setProductSearchTerm(productSetName)
      }

      // Set preview image if exists
      if (mini.id) {
        const previewPath = getMiniImagePath(mini.id, 'original')
        setPreviewUrl(previewPath)
      }
    }
  }, [mini])

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        location: '',
        quantity: 1,
        painted_by_id: 0,
        base_size_id: 0,
        product_set_id: null,
        types: []
      })
      setSelectedTypes([])
      setPreviewUrl(null)
      setImage(null)
      setProductSearchTerm('')
      setTypeSearchTerm('')
      setShowProductDropdown(false)
      setShowTypeDropdown(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!mini && isOpen) {
      const prepaintedId = paintedByOptions.find(p => 
        p.painted_by_name.toLowerCase() === 'prepainted'
      )?.id || 0
      const mediumId = baseSizeOptions.find(b => 
        b.base_size_name.toLowerCase() === 'medium'
      )?.id || 0

      setFormData(prev => ({
        ...prev,
        painted_by_id: prepaintedId,
        base_size_id: mediumId
      }))
    }
  }, [paintedByOptions, baseSizeOptions, mini, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous validation errors
    setValidationErrors({})

    // Validate form
    if (!validateForm()) {
      return
    }

    try {
      // Prepare the data
      const miniatureData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        quantity: formData.quantity,
        painted_by_id: formData.painted_by_id,
        base_size_id: formData.base_size_id,
        product_set_id: formData.product_set_id || null,
        types: selectedTypes.map(t => ({
          id: t.id,
          proxy_type: t.proxy_type
        }))
      }

      if (isEditMode && mini?.id) {
        await updateMiniature(mini.id, miniatureData)
      } else {
        await createMiniature(miniatureData)
      }

      // Call the parent's onSave callback
      await onSave({
        ...miniatureData,
        types: selectedTypes.map(t => ({
          type: { id: t.id, name: t.name, categories: [] },
          proxy_type: t.proxy_type,
          id: t.id,
          name: t.name,
          categories: []
        }))
      })

    } catch (error) {
      console.error('Error saving miniature:', error)
      if (error instanceof Error) {
        showError(error.message)
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleImageClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setImage(file)
        setPreviewUrl(URL.createObjectURL(file))
      }
    }
    input.click()
  }

  const handleTypeSelect = (typeId: number) => {
    const type = miniTypes.find(t => t.id === typeId)
    if (type && !selectedTypes.some(t => t.id === type.id)) {
      const newType = {
        id: type.id,
        name: type.name,
        categories: type.categories,
        proxy_type: selectedTypes.some(t => !t.proxy_type) // If there's already a main type, this is a proxy
      }
      
      setSelectedTypes([...selectedTypes, newType])
      setFormData(prev => ({
        ...prev,
        types: [...prev.types, { id: type.id, proxy_type: newType.proxy_type }]
      }))
    }
    setTypeSearchTerm('')
    setShowTypeDropdown(false)
    // Focus the input after selection
    setTimeout(() => {
      typeSearchInputRef.current?.focus()
    }, 0)
  }

  const handleTypeRemove = (typeId: number) => {
    setSelectedTypes(prev => {
      const newTypes = prev.filter(t => t.id !== typeId)
      // If only one type remains, make it the main type
      if (newTypes.length === 1) {
        newTypes[0].proxy_type = false
      }
      return newTypes
    })
    setFormData(prev => ({
      ...prev,
      types: prev.types.filter(t => t.id !== typeId)
    }))
  }

  const toggleProxyType = (typeId: number) => {
    setSelectedTypes(prev => {
      // Find the type we're toggling
      const targetType = prev.find(t => t.id === typeId)
      if (!targetType) return prev

      // If this type is already main, don't allow toggle if it's the only main
      if (!targetType.proxy_type && !prev.some(t => t.id !== typeId && !t.proxy_type)) {
        return prev
      }

      return prev.map(t => ({
        ...t,
        proxy_type: t.id === typeId ? !t.proxy_type : t.id !== typeId ? true : t.proxy_type
      }))
    })

    setFormData(prev => ({
      ...prev,
      types: selectedTypes.map(t => ({
        id: t.id,
        proxy_type: t.proxy_type
      }))
    }))
  }

  const filteredTypes = miniTypes.filter(type => 
    type.name.toLowerCase().includes(typeSearchTerm.toLowerCase()) &&
    !selectedTypes.some(st => st.id === type.id)
  )

  // Get unique categories from selected types
  const selectedCategories = useMemo(() => {
    const categories = new Set<string>()
    selectedTypes.forEach(type => {
      const typeData = miniTypes.find(t => t.id === type.id)
      if (typeData?.categories) {
        typeData.categories.forEach(cat => {
          categories.add(cat.name)
        })
      }
    })
    return Array.from(categories).sort()
  }, [selectedTypes, miniTypes])

  // Get filtered product sets based on search
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm) return []
    
    const searchLower = productSearchTerm.toLowerCase()
    const results: Array<{
      company: string
      line: string
      set: string
      id: number
    }> = []

    companies.forEach(company => {
      const lines = getProductLinesByCompany(company.id)
      lines.forEach(line => {
        const sets = getProductSetsByProductLine(line.id)
        sets.forEach(set => {
          const companyMatch = company.name.toLowerCase().includes(searchLower)
          const lineMatch = line.name.toLowerCase().includes(searchLower)
          const setMatch = set.name.toLowerCase().includes(searchLower)

          if (companyMatch || lineMatch || setMatch) {
            results.push({
              company: company.name,
              line: line.name,
              set: set.name,
              id: set.id
            })
          }
        })
      })
    })

    return results
  }, [productSearchTerm, companies, getProductLinesByCompany, getProductSetsByProductLine])

  // Get selected product set display name
  const selectedProductDisplay = useMemo(() => {
    if (!formData.product_set_id) return ''

    for (const company of companies) {
      const lines = getProductLinesByCompany(company.id)
      for (const line of lines) {
        const sets = getProductSetsByProductLine(line.id)
        const set = sets.find(s => s.id === formData.product_set_id)
        if (set) {
          return `${company.name} → ${line.name} → ${set.name}`
        }
      }
    }
    return ''
  }, [formData.product_set_id, companies, getProductLinesByCompany, getProductSetsByProductLine])

  // Add state for invalid product set
  const [isInvalidProductSet, setIsInvalidProductSet] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!mini?.id || !onDelete) return
    
    try {
      setIsDeleting(true)
      await onDelete(mini.id)
      setShowDeleteConfirm(false)
      onClose()
    } catch (error) {
      console.error('Error deleting miniature:', error)
      if (error instanceof Error) {
        showError(error.message)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (loadingRef) {
    return (
      <UI.Modal isOpen={isOpen} onClose={onClose}>
        <UI.LoadingSpinner message="Loading..." />
      </UI.Modal>
    )
  }

  if (errorRef) {
    return (
      <UI.Modal isOpen={isOpen} onClose={onClose}>
        <div className="p-4 text-center text-red-500">
          Error loading form data: {errorRef}
        </div>
      </UI.Modal>
    )
  }

  return (
    <UI.Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="min-w-[800px] max-w-[800px] flex flex-col max-h-[calc(100vh-8rem)]">
        <UI.ModalHeader>
          <div className="flex items-center gap-3">
            <div className="text-xl text-blue-600">
              <FaDiceD6 />
            </div>
            <h2 className="text-xl font-semibold">
              {isEditMode ? 'Edit Miniature' : 'Add New Miniature'}
            </h2>
          </div>
        </UI.ModalHeader>

        <UI.ModalBody className="flex-1 overflow-hidden">
          <div className="grid grid-cols-[250px_1fr] gap-8 h-full">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Image Drop Zone */}
              <div
                className="w-full aspect-square border border-gray-800 rounded-lg cursor-pointer hover:border-gray-700 transition-colors relative overflow-hidden bg-gray-900/50"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={handleImageClick}
              >
                {previewUrl ? (
                  <div className="relative w-full h-full group">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.parentElement?.querySelector('.placeholder-icon')?.classList.remove('hidden')
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center hidden placeholder-icon">
                      <FaDiceD20 className="w-20 h-20 text-gray-700/50" />
                      <span className="text-sm text-center px-4 text-gray-700/50 mt-2">Drop image here or click to select</span>
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <FaImage className="w-8 h-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700/50">
                    <FaDiceD20 className="w-20 h-20" />
                    <span className="text-sm text-center px-4 mt-2">Drop image here or click to select</span>
                  </div>
                )}
              </div>

              {/* Location and Quantity */}
              <div className="grid grid-cols-[1fr_80px] gap-4">
                <Input
                  label="Location"
                  value={formData.location}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, location: e.target.value }))
                    if (validationErrors.location) {
                      setValidationErrors(prev => ({ ...prev, location: undefined }))
                    }
                  }}
                  placeholder="Enter storage location"
                  required
                  ref={locationInputRef}
                  error={validationErrors.location}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                      if (validationErrors.quantity) {
                        setValidationErrors(prev => ({ ...prev, quantity: undefined }))
                      }
                    }}
                    placeholder="Qty"
                    required
                    ref={quantityInputRef}
                    className={`w-full px-3 py-2 bg-gray-800 rounded border ${
                      validationErrors.quantity ? 'border-red-500' : 'border-gray-700'
                    } focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none`}
                  />
                  {validationErrors.quantity && (
                    <div className="text-sm text-red-500 mt-1">{validationErrors.quantity}</div>
                  )}
                </div>
              </div>

              {/* Base Size */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Base Size</label>
                <select
                  value={formData.base_size_id}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, base_size_id: parseInt(e.target.value) }))
                    if (validationErrors.base_size_id) {
                      setValidationErrors(prev => ({ ...prev, base_size_id: undefined }))
                    }
                  }}
                  required
                  ref={baseSizeSelectRef}
                  className={`w-full px-3 py-2 bg-gray-800 rounded border ${
                    validationErrors.base_size_id ? 'border-red-500' : 'border-gray-700'
                  } focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none`}
                >
                  {baseSizeOptions.map(size => (
                    <option key={size.id} value={size.id}>
                      {size.base_size_name.charAt(0).toUpperCase() + size.base_size_name.slice(1)}
                    </option>
                  ))}
                </select>
                {validationErrors.base_size_id && (
                  <div className="text-sm text-red-500 mt-1">{validationErrors.base_size_id}</div>
                )}
              </div>

              {/* Painted By Boxes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Painted By</label>
                <div className="grid grid-cols-3 gap-2">
                  {paintedByOptions.slice(0, 3).map(painter => (
                    <button
                      key={painter.id}
                      type="button"
                      className={`p-3 rounded border capitalize ${
                        formData.painted_by_id === painter.id
                          ? 'border-green-600 bg-green-600/20'
                          : validationErrors.painted_by_id 
                            ? 'border-red-500'
                            : 'border-gray-600 hover:border-gray-500'
                      } transition-colors text-sm`}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, painted_by_id: painter.id }))
                        if (validationErrors.painted_by_id) {
                          setValidationErrors(prev => ({ ...prev, painted_by_id: undefined }))
                        }
                      }}
                    >
                      {painter.painted_by_name.toLowerCase()}
                    </button>
                  ))}
                </div>
                {validationErrors.painted_by_id && (
                  <div className="text-sm text-red-500 mt-1">{validationErrors.painted_by_id}</div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 h-full flex flex-col">
              {/* Name Input */}
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                  if (validationErrors.name) {
                    setValidationErrors(prev => ({ ...prev, name: undefined }))
                  }
                }}
                placeholder="Enter miniature name"
                required
                autoFocus
                ref={nameInputRef}
                error={validationErrors.name}
              />

              {/* Product Set Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-1">Product Set</label>
                <UI.SearchInput
                  value={selectedProductDisplay || productSearchTerm}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setProductSearchTerm(newValue)
                    setShowProductDropdown(true)
                    if (formData.product_set_id) {
                      setFormData(prev => ({ ...prev, product_set_id: null }))
                    }
                    // Mark as invalid if there's input but no match in filtered products
                    setIsInvalidProductSet(newValue !== '' && !filteredProducts.some(p => 
                      `${p.company} → ${p.line} → ${p.set}`.toLowerCase().includes(newValue.toLowerCase())
                    ))
                  }}
                  placeholder="Search for Company → Line → Set..."
                  onFocus={() => {
                    if (formData.product_set_id) {
                      setProductSearchTerm('')
                      setFormData(prev => ({ ...prev, product_set_id: null }))
                    }
                    setShowProductDropdown(true)
                  }}
                  onBlur={() => {
                    // On blur, if the input doesn't match any product and isn't empty, clear it
                    setTimeout(() => {
                      if (isInvalidProductSet && productSearchTerm) {
                        setProductSearchTerm('')
                        setIsInvalidProductSet(false)
                      }
                      setShowProductDropdown(false)
                    }, 200)
                  }}
                  showClearButton={true}
                  onClear={() => {
                    setProductSearchTerm('')
                    setFormData(prev => ({ ...prev, product_set_id: null }))
                    setShowProductDropdown(false)
                    setIsInvalidProductSet(false)
                  }}
                  error={isInvalidProductSet ? 'Please select a valid product set' : undefined}
                />
                {showProductDropdown && productSearchTerm && (
                  <div className="absolute left-0 right-0 z-10 mt-1 max-h-32 overflow-y-auto border border-gray-700 rounded-md bg-gray-800 shadow-lg">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, product_set_id: product.id }))
                          setProductSearchTerm('')
                          setShowProductDropdown(false)
                        }}
                      >
                        {`${product.company} → ${product.line} → ${product.set}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Types Card */}
              <div className="border border-gray-700 rounded-lg overflow-hidden h-[300px] flex flex-col">
                <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                  <h3 className="font-medium text-gray-200">Types</h3>
                </div>
                <div className="p-4 space-y-3 flex-1 overflow-y-auto bg-gray-900 relative">
                  <div className="relative">
                    <UI.SearchInput
                      value={typeSearchTerm}
                      onChange={(e) => {
                        setTypeSearchTerm(e.target.value)
                        setShowTypeDropdown(true)
                      }}
                      placeholder="Search types..."
                      onFocus={() => {
                        setTypeSearchTerm('')
                        setShowTypeDropdown(true)
                      }}
                      ref={typeSearchInputRef}
                    />
                    {showTypeDropdown && typeSearchTerm && (
                      <div className="absolute left-0 right-0 z-10 mt-1 max-h-32 overflow-y-auto border border-gray-700 rounded-md bg-gray-800 shadow-lg">
                        {filteredTypes.map(type => (
                          <button
                            key={type.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
                            onClick={() => handleTypeSelect(type.id)}
                          >
                            {type.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedTypes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '45px' }}>
                      <div className="text-3xl font-bold text-gray-800/70">No Types Assigned</div>
                    </div>
                  )}
                  {selectedTypes.length > 0 && (
                    <div className="space-y-3">
                      <div className="border border-gray-700 rounded-md bg-gray-900/50">
                        {selectedTypes.map((type, index) => (
                          <div
                            key={`${type.id}-${index}`}
                            className="flex items-center justify-between px-3 py-2 hover:bg-gray-700 cursor-pointer"
                            onClick={() => toggleProxyType(type.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                !type.proxy_type ? 'bg-green-500' : 'bg-gray-500'
                              }`} />
                              <span className="text-sm">{type.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTypeRemove(type.id)
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <FaTimesCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {selectedCategories.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedCategories.map((category, index) => (
                            <div
                              key={`${category}-${index}`}
                              className="px-2 py-1 text-xs rounded-full bg-orange-900/50 text-orange-200"
                            >
                              {category}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <UI.TextArea
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter miniature description"
                className="flex-none"
                rows={3}
              />
            </div>
          </div>
        </UI.ModalBody>

        <UI.ModalFooter>
          <div className="flex justify-between w-full">
            {isEditMode && onDelete && (
              <UI.Button
                variant="btnDanger"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
              >
                <div className="flex items-center gap-2">
                  <FaTrash className="w-4 h-4" />
                  Delete Miniature
                </div>
              </UI.Button>
            )}
            <div className="flex gap-2 ml-auto">
              <UI.Button
                variant="btnPrimary"
                onClick={onClose}
                type="button"
              >
                Cancel
              </UI.Button>
              <UI.Button
                variant="btnSuccess"
                type="submit"
                disabled={isLoading}
              >
                {isLoading 
                  ? (isEditMode ? 'Saving...' : 'Adding...') 
                  : (isEditMode ? 'Save Changes' : 'Add Miniature')
                }
              </UI.Button>
            </div>
          </div>
        </UI.ModalFooter>
      </form>

      <UI.DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Miniature"
        message={`Are you sure you want to delete "${mini?.name}"? This action cannot be undone.`}
        icon={FaTrash}
      />
    </UI.Modal>
  )
} 