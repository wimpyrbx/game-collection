import { useState, useEffect, useMemo, useRef } from 'react'
import { Input } from '../ui/Input'
import * as UI from '../ui'
import { FaDiceD6, FaTimesCircle, FaDiceD20, FaTrash, FaExclamationTriangle, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import type { Mini } from '../../types/mini'
import { useMiniatureReferenceData } from '../../hooks/useMiniatureReferenceData'
import { getMiniImagePath } from '../../utils/imageUtils'
import { createMiniature, updateMiniature } from '../../services/miniatureService'
import { useNotifications } from '../../contexts/NotificationContext'
import { supabase } from '../../lib/supabase'
import { TagInput } from '../ui/input/TagInput'
import { motion, AnimatePresence } from 'framer-motion'
import { ShowItems } from '../ShowItems'
import { sortByKey } from '../../utils/generalUtils'

interface MiniatureOverviewModalProps {
  isOpen: boolean
  onClose: () => void
  miniId?: number
  miniData?: Mini
  onSave: (data: Partial<Mini>) => Promise<void>
  onDelete?: (miniId: number) => Promise<void>
  isLoading?: boolean
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

interface SelectedType {
  id: number
  name: string
  proxy_type: boolean
  type?: {
    id: number
    name: string
    categories?: Array<{
      category?: {
        id: number
        name: string
      }
    }>
  }
}

// Add new interface for validation errors
interface ValidationErrors {
  name?: string
  location?: string
  base_size_id?: string
  painted_by_id?: string
  quantity?: string
}

// Add this utility function at the top of the file

export function MiniatureOverviewModal({ 
  isOpen, 
  onClose, 
  miniData,
  onSave,
  onDelete,
  isLoading,
  onPrevious,
  onNext,
  hasPrevious = true,
  hasNext = true
}: MiniatureOverviewModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    quantity: 1,
    painted_by_id: 0,
    base_size_id: 0,
    product_set_id: null as number | null,
    types: [] as { id: number, proxy_type: boolean }[],
    tags: [] as { id: number }[]
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

  const isEditMode = !!miniData

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

    // Only validate base_size_id if it's 0 (not selected)
    if (formData.base_size_id === 0) {
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

  // Load mini data when editing
  useEffect(() => {
    if (miniData) {
      // Handle types with proper type and category structure
      const mappedTypes = miniData.types?.filter(t => t && t.type)?.map(t => ({
        id: t.type_id,
        proxy_type: t.proxy_type,
        name: t.type.name,
        type: {
          id: t.type.id,
          name: t.type.name,
          categories: t.type.categories?.map(cat => ({
            category: cat.category  // Keep the nested category structure
          })) || []
        }
      })) || []

      // Handle tags with proper tag structure
      const mappedTags = miniData.tags?.filter(t => t && t.tag)?.map(t => ({
        id: t.tag.id,
        name: t.tag.name
      })) || []

      setFormData(prev => ({
        ...prev,
        name: miniData.name || '',
        description: miniData.description || '',
        location: miniData.location || '',
        quantity: miniData.quantity || 1,
        painted_by_id: miniData.painted_by_id || 0,
        base_size_id: miniData.base_size_id || 0,
        product_set_id: miniData.product_set_id || null,
        types: mappedTypes,
        tags: mappedTags
      }))

      setSelectedTypes(mappedTypes)
      setSelectedTags(mappedTags)
    }
  }, [miniData])

  // Add this effect to handle product set selection
  useEffect(() => {
    if (formData.product_set_id) {
      // Find the product set in the available options
      for (const company of companies) {
        const lines = getProductLinesByCompany(company.id)
        for (const line of lines) {
          const sets = getProductSetsByProductLine(line.id)
          const set = sets.find(s => s.id === formData.product_set_id)
          if (set) {
            const displayValue = `${company.name} → ${line.name} → ${set.name}`
            setProductSearchTerm(displayValue)
            setShowProductDropdown(false)
            return
          }
        }
      }
    }
  }, [formData.product_set_id, companies, getProductLinesByCompany, getProductSetsByProductLine])

  // Add logging when modal opens/closes
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
        types: [],
        tags: []
      })
      setSelectedTypes([])
      setSelectedTags([])
      setPendingTags([])
      setPreviewUrl(null)
      setImage(null)
      setProductSearchTerm('')
      setTypeSearchTerm('')
      setShowProductDropdown(false)
      setShowTypeDropdown(false)
    } else if (miniData) {
      // When modal opens with a mini, set the preview URL
      const url = getMiniImagePath(miniData.id, 'original')
      // console.log('Setting preview URL:', url)
      setPreviewUrl(url)
    }
  }, [isOpen, miniData])

  useEffect(() => {
    if (!miniData && isOpen) {
      const prepaintedId = paintedByOptions.find(p => 
        p.painted_by_name.toLowerCase() === 'Prepainted'.toLowerCase()
      )?.id || 0
      const mediumId = baseSizeOptions.find(b => 
        b.base_size_name.toLowerCase() === 'Medium'.toLowerCase()
      )?.id || 0

      setFormData(prev => ({
        ...prev,
        painted_by_id: prepaintedId,
        base_size_id: mediumId
      }))
    }
  }, [paintedByOptions, baseSizeOptions, miniData, isOpen])

  // Add state for pending new tags
  const [pendingTags, setPendingTags] = useState<string[]>([])

  // Modify handleSubmit to ensure tags are saved
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      // Create any pending tags first
      const newTagIds = await Promise.all(
        pendingTags.map(async (tagName) => {
          const { data, error } = await supabase
            .from('tags')
            .insert({ name: tagName })
            .select()
            .single()
          
          if (error) {
            console.error('Error creating tag:', error)
            throw error
          }
          return data
        })
      )

      // Combine existing selected tags with newly created tags
      const allTags = [
        ...selectedTags.filter(t => t.id > 0),
        ...newTagIds
      ]

      // Prepare the data
      const miniatureData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        quantity: formData.quantity,
        painted_by_id: formData.painted_by_id,
        base_size_id: formData.base_size_id,
        product_set_id: formData.product_set_id,
        types: selectedTypes.map(t => ({
          mini_id: miniData?.id || 0,
          type_id: t.id,
          proxy_type: t.proxy_type,
          type: {
            id: t.id,
            name: t.name,
            categories: miniTypes.find(mt => mt.id === t.id)?.categories?.map(cat => ({
              category: {
                id: cat.id,
                name: cat.name
              }
            })) || []
          }
        })),
        tags: allTags.map(t => ({
          id: t.id,
          name: t.name
        }))
      }

      // console.log('Submitting miniature data:', miniatureData)

      if (isEditMode && miniData?.id) {
        await updateMiniature(miniData.id, miniatureData)
      } else {
        await createMiniature(miniatureData)
      }
      setPendingTags([])
      // Transform tags to match expected type before saving
      const transformedMiniatureData = {
        ...miniatureData,
        tags: miniatureData.tags.map(t => ({
          id: t.id,
          tag: {
            id: t.id,
            name: t.name
          }
        }))
      }
      await onSave(transformedMiniatureData)

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
    const selectedType = miniTypes.find(t => t.id === typeId)
    if (selectedType && !selectedTypes.some(t => t.id === typeId)) {
      const isFirstType = selectedTypes.length === 0
      const newType = {
        id: typeId,
        name: selectedType.name,
        proxy_type: !isFirstType,
        type: selectedType
      }
      
      setSelectedTypes(prev => [...prev, newType])
      
      setFormData(prev => ({
        ...prev,
        types: [...prev.types, { id: typeId, proxy_type: !isFirstType }]
      }))
      
      setTypeSearchTerm('')
      setShowTypeDropdown(false)
      
      // Ensure focus is set after state updates are complete
      setTimeout(() => {
        if (typeSearchInputRef.current) {
          typeSearchInputRef.current.focus()
        }
      }, 0)
    }
  }

  const handleTypeRemove = (typeId: number) => {
    setSelectedTypes(prev => {
      // Check if we're removing the non-proxy type
      const isRemovingMainType = prev.find(t => t.id === typeId)?.proxy_type === false
      
      const newTypes = prev.filter(t => t.id !== typeId)
      
      // If we removed the main type and there are other types remaining,
      // set the first remaining type as the main type
      if (isRemovingMainType && newTypes.length > 0) {
        newTypes[0].proxy_type = false
        // Set all other types as proxies
        for (let i = 1; i < newTypes.length; i++) {
          newTypes[i].proxy_type = true
        }
      }

      // Also update formData.types to match
      setFormData(prevForm => ({
        ...prevForm,
        types: newTypes.map(t => ({
          id: t.id,
          type_id: t.id,
          proxy_type: t.proxy_type,
          type: {
            id: t.id,
            name: t.name,
            categories: miniTypes.find(mt => mt.id === t.id)?.categories || []
          }
        }))
      }))

      return newTypes
    })
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

      const updated = prev.map(t => ({
        ...t,
        proxy_type: t.id === typeId ? !t.proxy_type : t.id !== typeId ? true : t.proxy_type
      }))

      // Also update formData.types to match
      setFormData(prevForm => ({
        ...prevForm,
        types: updated.map(t => ({
          id: t.id,
          type_id: t.id,
          proxy_type: t.proxy_type,
          type: {
            id: t.id,
            name: t.name,
            categories: miniTypes.find(mt => mt.id === t.id)?.categories || []
          }
        }))
      }))

      return updated
    })
  }

  const filteredTypes = useMemo(() => {
    const searchTerm = typeSearchTerm.toLowerCase().trim()
    
    return miniTypes.filter(type => {
      const typeName = type.name.toLowerCase().trim()
      const matches = typeName.includes(searchTerm)
      const notSelected = !selectedTypes.some(st => st.id === type.id)
      return matches && notSelected
    })
  }, [typeSearchTerm, miniTypes, selectedTypes])

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

    // Search through available product sets
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
  const [, setIsInvalidProductSet] = useState(false)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!miniData?.id || !onDelete) return
    
    try {
      setIsDeleting(true)
      await onDelete(miniData.id)
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

  // State for tags
  const [selectedTags, setSelectedTags] = useState<Array<{ id: number; name: string }>>([])
  const [tagInput, setTagInput] = useState('')

  // Add state for available tags
  const [availableTags, setAvailableTags] = useState<{ id: number; name: string }[]>([])

  // Add useEffect to fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      const { data: tags, error } = await supabase
        .from('tags')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('Error fetching tags:', error)
        return
      }
      
      setAvailableTags(tags || [])
    }
    
    fetchTags()
  }, [])

  // Add this handler
  const handleTagAdd = async (tagName: string) => {
    const trimmedTag = tagName.trim()
    if (!trimmedTag) return

    // Check if tag already exists
    const existingTag = availableTags.find(t => 
      t.name.toLowerCase() === trimmedTag.toLowerCase()
    )

    if (existingTag) {
      // If tag exists, add it to selected tags
      if (!selectedTags.some(t => t.id === existingTag.id)) {
        setSelectedTags(prev => [...prev, existingTag])
      }
    } else {
      // If tag is new, add to pending tags
      setPendingTags(prev => {
        // Only add if not already in pending tags
        if (!prev.includes(trimmedTag)) {
          return [...prev, trimmedTag]
        }
        return prev
      })
      
      // Add to selected tags with temporary ID
      const tempId = -Date.now()
      setSelectedTags(prev => {
        // Only add if not already in selected tags
        if (!prev.some(t => t.name.toLowerCase() === trimmedTag.toLowerCase())) {
          return [...prev, { id: tempId, name: trimmedTag }]
        }
        return prev
      })
    }
  }

  const handleTagRemove = (tagId: number) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId))
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t.id !== tagId)
    }))
  }

  // Update reset state to clear pending tags
  useEffect(() => {
    const resetState = () => {
      // Find default IDs
      const prepaintedId = paintedByOptions.find(p => 
        p.painted_by_name.toLowerCase() === 'Prepainted'.toLowerCase()
      )?.id || 0
      
      const mediumId = baseSizeOptions.find(b => 
        b.base_size_name.toLowerCase() === 'Medium'.toLowerCase()
      )?.id || 0

      setFormData({
        name: '',
        location: '',
        quantity: 1,
        description: '',
        base_size_id: isOpen && !miniData ? mediumId : 0,
        painted_by_id: isOpen && !miniData ? prepaintedId : 0,
        product_set_id: null,
        types: [],
        tags: []
      })
      setImage(null)
      setPreviewUrl(null)
      setSelectedTypes([])
      setSelectedTags([])
      setTypeSearchTerm('')
      setProductSearchTerm('')
      setValidationErrors({})
      setShowTypeDropdown(false)
      setShowProductDropdown(false)
      setPendingTags([])
    }

    if (isOpen && !miniData) {
      resetState()
    }

    if (!isOpen) {
      resetState()
    }
  }, [isOpen, miniData, baseSizeOptions, paintedByOptions])

  const [showImage, setShowImage] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  // Update the image initialization effect
  useEffect(() => {
    let mounted = true;

    const initializeImage = (miniId: number) => {
      if (!mounted) return;
      
      setIsImageLoading(true);
      setImageError(null);
      setShowImage(false);
      
      // Create new image object
      const img = new Image();
      
      img.onload = () => {
        if (!mounted) return;
        setIsImageLoading(false);
        // Add small delay before showing image for smooth animation
        requestAnimationFrame(() => {
          if (mounted) setShowImage(true);
        });
      };
      
      img.onerror = () => {
        if (!mounted) return;
        setIsImageLoading(false);
        setImageError('Image not available');
        setShowImage(false);
      };
      // Set source last
      img.src = getMiniImagePath(miniId, 'original');
    };

    if (isOpen && miniData?.id) {
      // Reset states when modal opens
      setShowImage(false);
      
      // Small delay to ensure modal transition is complete
      const timer = setTimeout(() => {
        if (mounted) {
          initializeImage(miniData.id);
        }
      }, 100);

      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    } else {
      setShowImage(false);
      setIsImageLoading(false);
      setImageError(null);
    }

    return () => {
      mounted = false;
    };
  }, [isOpen, miniData?.id]);

  useEffect(() => {
    if (isOpen && !miniData) {
      console.error('Modal opened but no mini data available');
      onClose();
    }
  }, [isOpen, miniData, onClose]);

  // Add this with your other refs
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Add this state for dropdown positioning
  const [dropdownStyle, setDropdownStyle] = useState({
    width: 0,
    left: 0,
    top: 0
  })

  // Add this effect to update dropdown position
  useEffect(() => {
    if (showTypeDropdown && searchContainerRef.current) {
      const rect = searchContainerRef.current.getBoundingClientRect()
      setDropdownStyle({
        width: rect.width,
        left: rect.left,
        top: rect.bottom + 4 // 4px gap
      })
    }
  }, [showTypeDropdown, typeSearchTerm])

  // Add this with your other refs
  const tagSearchContainerRef = useRef<HTMLDivElement>(null)

  // Add this state for tag dropdown positioning
  const [tagDropdownStyle, setTagDropdownStyle] = useState({
    width: 0,
    left: 0,
    top: 0
  })

  // Add this effect to update tag dropdown position
  useEffect(() => {
    if (tagSearchContainerRef.current) {
      const rect = tagSearchContainerRef.current.getBoundingClientRect()
      setTagDropdownStyle({
        width: rect.width,
        left: rect.left,
        top: rect.bottom + 4 // 4px gap
      })
    }
  }, [tagInput])

  // Add useEffect to reset search fields when miniId changes
  useEffect(() => {
    // Reset search fields when switching miniatures
    setTypeSearchTerm('')
    setTagInput('')
    setShowTypeDropdown(false)
  }, [miniData]) // Add miniData as dependency

  // First, make sure we're getting the categories from all types
  const selectedTypeCategories = useMemo(() => {
    // Get categories from all types
    const allCategories = selectedTypes.flatMap(type => {
      const typeWithCategories = miniTypes.find(t => t.id === type.id)
      return typeWithCategories?.categories || []
    })
    
    // Remove duplicates based on category id
    const uniqueCategories = Array.from(
      new Map(allCategories.map(cat => [cat.id, cat])).values()
    )
    
    return uniqueCategories
  }, [selectedTypes, miniTypes])

  // Sort categories, tags, and types
  const sortedCategories = sortByKey(selectedTypeCategories, 'name');
  const sortedTags = sortByKey(selectedTags, 'name');
  const sortedTypes = sortByKey(selectedTypes, 'name');

  // Map sorted categories, tags, and types to items
  const categoryItems = sortedCategories.map(category => ({
    id: category.id,
    label: category.name
  }));

  const tagItems = sortedTags.map(tag => ({
    id: tag.id,
    label: tag.name
  }));

  if (isOpen && !miniData) {
    return (
      <UI.Modal isOpen={isOpen} onClose={onClose}>
        <UI.LoadingSpinner message="Loading miniature data..." />
      </UI.Modal>
    );
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
    <UI.Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-[800px]">
      {/* Add navigation buttons */}
      {onPrevious && (
        <button
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="absolute left-[-60px] top-1/2 transform -translate-y-1/2 p-4 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-800 rounded-full shadow-lg"
          title="Previous miniature"
        >
          <FaChevronLeft className="w-10 h-10 text-white" />
        </button>
      )}
      
      {onNext && (
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="absolute right-[-60px] top-1/2 transform -translate-y-1/2 p-4 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-800 rounded-full shadow-lg"
          title="Next miniature"
        >
          <FaChevronRight className="w-10 h-10 text-white" />
        </button>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(100vh-8rem)]">
        <UI.ModalHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="text-xl text-blue-600">
                <FaDiceD6 />
              </div>
              <h2 className="text-xl font-semibold">
                {isEditMode ? 'Edit Miniature' : 'Add New Miniature'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              {isEditMode && miniData?.created_at && (
                <div className="italic text-right text-sm text-gray-400">
                  ID: <span className="text-gray-300">{miniData.id}</span>
                  <br />
                  Added: <span className="text-gray-300">{new Date(miniData.created_at).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).replace(',', '')}</span>
                </div>
              )}
              {isEditMode && miniData?.in_use && (
                <div className="flex items-center gap-1 px-1 py-1 bg-red-500/30 border border-red-500/20 rounded text-red-500 text-xs">
                  <FaExclamationTriangle className="text-yellow-500 w-7 h-7 ml-1 mr-2" />
                  <span className="text-gray-300">In Use:<br></br>
                  <span className="text-xs text-gray-400">
                    {new Date(miniData.in_use).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </UI.ModalHeader>

        <UI.ModalBody className="flex-1">
          <div className="grid grid-cols-[250px_1fr] gap-6">
            {/* Left Column - Image and remaining form fields */}
            <div className="space-y-3">
              {/* Image Drop Zone */}
              <div 
                className="w-full aspect-square border border-gray-800 rounded-lg cursor-pointer hover:border-gray-700 transition-colors relative overflow-hidden bg-gray-900/50"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={handleImageClick}
              >
                <AnimatePresence mode="wait">
                  {showImage && miniData?.id && !imageError ? (
                    <motion.div
                      key={`mini-image-${miniData.id}`}
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                        duration: 0.3
                      }}
                    >
                      <img
                        src={getMiniImagePath(miniData.id, 'original')}
                        alt={miniData.name}
                        className="w-full h-full object-contain"
                      />
                    </motion.div>
                  ) : previewUrl ? (
                    <motion.div
                      key="preview-image"
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                        duration: 0.3
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={() => setPreviewUrl(null)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      className="absolute inset-0 flex flex-col items-center justify-center text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isImageLoading ? (
                        <UI.LoadingSpinner message="Loading..." />
                      ) : (
                        <>
                          <FaDiceD20 className="w-12 h-12 mb-2" />
                          <span className="text-sm">Drop image here or click to select</span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Location */}
              <Input
                value={formData.location}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, location: e.target.value }))
                  if (validationErrors.location) {
                    setValidationErrors(prev => ({ ...prev, location: undefined }))
                  }
                }}
                placeholder="Location"
                required
                ref={locationInputRef}
                error={validationErrors.location}
              />

              {/* Base Size */}
              <select
                value={formData.base_size_id}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  setFormData(prev => ({ ...prev, base_size_id: value }))
                  if (validationErrors.base_size_id) {
                    setValidationErrors(prev => ({ ...prev, base_size_id: undefined }))
                  }
                }}
                required
                ref={baseSizeSelectRef}
                className={`h-10 w-full px-3 bg-gray-800 rounded border ${
                  validationErrors.base_size_id ? 'border-red-500' : 'border-gray-700'
                } focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none`}
              >
                <option value={0} disabled>Base Size</option>
                {baseSizeOptions.map(size => (
                  <option key={size.id} value={size.id}>
                    {size.base_size_name.charAt(0).toUpperCase() + size.base_size_name.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>

              {/* Painted By Boxes */}
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
            </div>

            {/* Right Column - Types, Tags, and moved fields */}
            <div className="space-y-3">
              {/* Name and Quantity */}
              <div className="grid grid-cols-[1fr_60px] gap-2 items-center">
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }))
                    if (validationErrors.name) {
                      setValidationErrors(prev => ({ ...prev, name: undefined }))
                    }
                  }}
                  placeholder="Name"
                  required
                  ref={nameInputRef}
                  error={validationErrors.name}
                />
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
                  className={`h-10 w-full px-3 bg-gray-800 rounded border ${
                    validationErrors.quantity ? 'border-red-500' : 'border-gray-700'
                  } focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none`}
                />
              </div>

              {/* Product Set */}
              <div className="relative">
                <UI.SearchInput
                  value={selectedProductDisplay || productSearchTerm}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setProductSearchTerm(newValue)
                    setShowProductDropdown(true)
                    if (formData.product_set_id) {
                      setFormData(prev => ({ ...prev, product_set_id: null }))
                    }
                    setIsInvalidProductSet(newValue !== '' && !filteredProducts.some(p => 
                      `${p.company} → ${p.line} → ${p.set}`.toLowerCase().includes(newValue.toLowerCase())
                    ))
                  }}
                  placeholder="Product Set"
                />
                {showProductDropdown && (productSearchTerm || formData.product_set_id) && (
                  <div className="absolute left-0 right-0 z-10 mt-1 max-h-32 overflow-y-auto border border-gray-700 rounded-md bg-gray-800 shadow-lg scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 hover:bg-gray-700 text-sm ${
                          formData.product_set_id === product.id ? 'bg-gray-700' : ''
                        }`}
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

              {/* Types and Tags grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Types Card */}
                <div className="border border-gray-700 rounded-lg overflow-hidden flex flex-col h-full">
                  <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                    <h3 className="font-medium text-gray-200">Types</h3>
                  </div>
                  <div className="p-4 space-y-3 bg-gray-800 flex-1 min-h-[300px]">
                    <div className="relative" ref={searchContainerRef}>
                      <UI.SearchInput
                        value={typeSearchTerm}
                        onChange={(e) => {
                          setTypeSearchTerm(e.target.value)
                          setShowTypeDropdown(true)
                        }}
                        placeholder="Search types..."
                      />
                      {showTypeDropdown && typeSearchTerm && (
                        <div 
                          className="fixed max-h-48 overflow-y-auto border border-gray-700 rounded-md bg-gray-800 shadow-lg scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 z-[9999]"
                          style={{
                            width: dropdownStyle.width,
                            left: dropdownStyle.left,
                            top: dropdownStyle.top
                          }}
                        >
                          {filteredTypes.map(type => (
                            <button
                              key={type.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleTypeSelect(type.id)
                              }}
                            >
                              {type.name}
                            </button>
                          ))}
                          {filteredTypes.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              No matches found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedTypes.length === 0 && (
                      <div className="inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-3xl font-bold text-gray-800/70">No Types Assigned</div>
                      </div>
                    )}
                    {selectedTypes.length > 0 && (
                      <div className="space-y-3">
                        <div className="border border-gray-700 rounded-md bg-gray-900/50">
                          {selectedTypes.map((type, index) => (
                            <div key={`${type.id}-${index}`} className="border-b border-gray-700 last:border-b-0">
                              <div
                                className="flex items-center justify-between px-3 py-1 hover:bg-gray-700 cursor-pointer"
                                onClick={() => toggleProxyType(type.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${type.proxy_type ? 'bg-orange-500' : 'bg-green-500'}`} />
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
                            </div>
                          ))}
                        </div>

                        {/* Categories */}
                        <div className="mt-1">
                          <ShowItems
                            items={categoryItems}
                            displayType="pills"
                            maxVisible={999}
                            scaleAnimation={true}
                            shadowEnabled={true}
                            itemStyle={{
                              text: 'text-gray-200',
                              bg: 'bg-cyan-900',
                              size: 'xs',
                              border: 'border border-cyan-800',
                              hover: 'hover:bg-cyan-700'
                            }}
                            emptyMessage="No categories available"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags Card */}
                <div className="border border-gray-700 rounded-lg overflow-hidden flex flex-col h-full">
                  <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
                    <h3 className="font-medium text-gray-200">Tags</h3>
                  </div>
                  <div className="p-4 space-y-3 bg-gray-800 flex-1 min-h-[300px]">
                    <div className="relative" ref={tagSearchContainerRef}>
                      <TagInput
                        value={tagInput}
                        onChange={setTagInput}
                        onTagAdd={handleTagAdd}
                        placeholder="Add tags..."
                        availableTags={availableTags}
                        onTagSelect={(tag) => {
                          if (!selectedTags.some(t => t.id === tag.id)) {
                            setSelectedTags(prev => [...prev, tag])
                            setFormData(prev => ({
                              ...prev,
                              tags: [...prev.tags || [], { id: tag.id }]
                            }))
                          }
                        }}
                        renderDropdown={(filteredTags) => (
                          <div 
                            className="fixed max-h-48 overflow-y-auto border border-gray-700 rounded-md bg-gray-800 shadow-lg scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 z-[9999]"
                            style={{
                              width: tagDropdownStyle.width,
                              left: tagDropdownStyle.left,
                              top: tagDropdownStyle.top
                            }}
                          >
                            {filteredTags.map(tag => (
                              <button
                                key={tag.id}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
                                onClick={() => {
                                  if (!selectedTags.some(t => t.id === tag.id)) {
                                    setSelectedTags(prev => [...prev, tag])
                                    setFormData(prev => ({
                                      ...prev,
                                      tags: [...prev.tags || [], { id: tag.id }]
                                    }))
                                  }
                                }}
                              >
                                {tag.name}
                              </button>
                            ))}
                          </div>
                        )}
                      />
                    </div>

                    <div>
                      {selectedTags.length === 0 ? (
                        <div className="flex items-center justify-center">
                          <div className="text-3xl font-bold text-gray-800/70">No Tags Assigned</div>
                        </div>
                      ) : (
                        <ShowItems
                          items={tagItems}
                          onItemRemove={(index) => handleTagRemove(tagItems[index].id)}
                          displayType="pills"
                          scaleAnimation={true}
                          shadowEnabled={true}
                          maxVisible={999}
                          itemStyle={{
                            text: 'text-gray-200',
                            bg: 'bg-gray-700',
                            size: 'xs',
                            border: 'border border-gray-600',
                            hover: 'hover:bg-gray-600'
                          }}
                          showRemoveButton={true}
                        />
                      )}
                    </div>
                  </div>
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
        message={`Are you sure you want to delete "${miniData?.name}"? This action cannot be undone.`}
        icon={FaTrash}
      />
    </UI.Modal>
  )
} 