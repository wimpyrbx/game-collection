import { useState, useEffect, useMemo, useRef } from 'react'
import * as UI from '../ui'
import { FaDiceD6, FaImage, FaTimesCircle, FaLayerGroup } from 'react-icons/fa'
import type { Mini } from '../../types/mini'
import { useMiniatureReferenceData } from '../../hooks/useMiniatureReferenceData'
import { getMiniImagePath } from '../../utils/imageUtils'

interface MiniatureOverviewModalProps {
  isOpen: boolean
  onClose: () => void
  mini?: Mini
  onSave: (data: Partial<Mini>) => Promise<void>
  isLoading?: boolean
}

interface SelectedType {
  id: number
  name: string
  proxy_type: boolean
}

export function MiniatureOverviewModal({ 
  isOpen, 
  onClose, 
  mini, 
  onSave,
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
  const [image, setImage] = useState<File | null>(null)
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

  // Find default IDs
  useEffect(() => {
    const prepaintedId = paintedByOptions.find(p => 
      p.painted_by_name.toLowerCase() === 'prepainted'
    )?.id || 0
    const mediumId = baseSizeOptions.find(b => 
      b.base_size_name.toLowerCase() === 'medium'
    )?.id || 0

    if (!mini) {
      setFormData({
        name: '',
        description: '',
        location: '',
        quantity: 1,
        painted_by_id: prepaintedId,
        base_size_id: mediumId,
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
  }, [paintedByOptions, baseSizeOptions, mini, isOpen])

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
    if (mini) {
      setFormData({
        name: mini.name,
        description: mini.description || '',
        location: mini.location || '',
        quantity: mini.quantity || 1,
        painted_by_id: mini.painted_by_id,
        base_size_id: mini.base_size_id,
        product_set_id: mini.product_set_id,
        types: mini.types?.map(t => ({
          id: t.id,
          proxy_type: false
        })) || []
      })

      // Set selected types
      const types = mini.types?.map(t => ({
        id: t.id,
        name: t.name,
        proxy_type: false
      })) || []
      setSelectedTypes(types)

      // Set preview image if exists
      if (mini.id) {
        setPreviewUrl(getMiniImagePath(mini.id, 'original'))
      }
    }
  }, [mini])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    // Transform types to include required fields
    const transformedTypes = formData.types.map(t => {
      const typeData = miniTypes.find(mt => mt.id === t.id)
      return {
        id: t.id,
        name: typeData?.name || '',
        categories: typeData?.categories || [],
        proxy_type: t.proxy_type
      }
    })

    await onSave({
      ...formData,
      types: transformedTypes
    })
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
                className="w-full aspect-square border border-gray-800 rounded-lg cursor-pointer hover:border-gray-700 transition-colors relative overflow-hidden"
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
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <FaImage className="w-8 h-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                    <FaImage className="w-12 h-12 mb-2" />
                    <span className="text-sm text-center px-4">Drop image here or click to select</span>
                  </div>
                )}
              </div>

              {/* Location and Quantity */}
              <div className="grid grid-cols-[1fr_80px] gap-4">
                <UI.Input
                  label="Location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter storage location"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Qty</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    placeholder="Qty"
                    required
                    className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Base Size */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Base Size</label>
                <select
                  value={formData.base_size_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_size_id: parseInt(e.target.value) }))}
                  required
                  className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  {baseSizeOptions.map(size => (
                    <option key={size.id} value={size.id}>
                      {size.base_size_name.charAt(0).toUpperCase() + size.base_size_name.slice(1)}
                    </option>
                  ))}
                </select>
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
                          : 'border-gray-600 hover:border-gray-500'
                      } transition-colors text-sm`}
                      onClick={() => setFormData(prev => ({ ...prev, painted_by_id: painter.id }))}
                    >
                      {painter.painted_by_name.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 h-full flex flex-col">
              {/* Name Input */}
              <UI.Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter miniature name"
                required
                autoFocus
              />

              {/* Product Set Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-1">Product Set</label>
                <UI.SearchInput
                  value={selectedProductDisplay || productSearchTerm}
                  onChange={(e) => {
                    setProductSearchTerm(e.target.value)
                    setShowProductDropdown(true)
                    if (formData.product_set_id) {
                      setFormData(prev => ({ ...prev, product_set_id: null }))
                    }
                  }}
                  placeholder="Search for Company → Line → Set..."
                  onFocus={() => {
                    if (formData.product_set_id) {
                      setProductSearchTerm('')
                      setFormData(prev => ({ ...prev, product_set_id: null }))
                    }
                    setShowProductDropdown(true)
                  }}
                  showClearButton={true}
                  onClear={() => {
                    setProductSearchTerm('')
                    setFormData(prev => ({ ...prev, product_set_id: null }))
                    setShowProductDropdown(false)
                  }}
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
                        {selectedTypes.map(type => (
                          <div
                            key={type.id}
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
                          {selectedCategories.map(category => (
                            <div
                              key={category}
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
          <div className="flex justify-end gap-2">
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
        </UI.ModalFooter>
      </form>
    </UI.Modal>
  )
} 