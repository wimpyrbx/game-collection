import { useState, useEffect, useMemo, useRef } from 'react'
import { Input } from '../ui/Input'
import * as UI from '../ui'
import { FaDiceD6, FaTimesCircle, FaDiceD20, FaTrash, FaExclamationTriangle, FaTrashAlt, FaExpand } from 'react-icons/fa'
import { HiOutlineArrowSmallLeft, HiOutlineArrowSmallRight } from 'react-icons/hi2'
import type { Mini, MiniType } from '../../types/mini'
import { useMiniatureReferenceData } from '../../hooks/useMiniatureReferenceData'
import { getMiniImagePath, getCompanyLogoPath } from '../../utils/imageUtils'
import { createMiniature, updateMiniature, deleteImage } from '../../services/miniatureService'
import { useNotifications } from '../../contexts/NotificationContext'
import { supabase } from '../../lib/supabase'
import { TagInput } from '../ui/input/TagInput'
import { motion, AnimatePresence } from 'framer-motion'
import { ShowItems } from '../ShowItems'
import { useAuth } from '../../contexts/AuthContext'
import { AuditService } from '../../services/auditService'
import { useTypeCategoryAdmin } from '../../hooks/useTypeCategoryAdmin'
import { createPortal } from 'react-dom'

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
  onImageUpload?: () => void
  children?: React.ReactNode
}

interface SelectedType {
  id: number
  proxy_type: boolean
  name: string
  type: {
    id: number
    name: string
    categories: Array<{
      category: {
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
function createGetOrCreateTag(setAvailableTags: React.Dispatch<React.SetStateAction<Array<{ id: number; name: string }>>>) {
  return async function getOrCreateTag(tagName: string) {
    try {
      // First try to find the existing tag
      const { data: existingTags, error: searchError } = await supabase
        .from('tags')
        .select('*')
        .ilike('name', tagName)
        .limit(1)

      if (searchError) throw searchError

      // If tag exists, return it
      if (existingTags && existingTags.length > 0) {
        return existingTags[0]
      }

      // If tag doesn't exist, create it
      const { data: newTag, error: createError } = await supabase
        .from('tags')
        .insert({ name: tagName })
        .select()
        .single()

      if (createError) throw createError

      // Update available tags immediately
      setAvailableTags(prev => {
        const newTags = [...prev, newTag]
        // Sort by name
        return newTags.sort((a, b) => a.name.localeCompare(b.name))
      })

      return newTag

    } catch (error) {
      console.error('Error in getOrCreateTag:', error)
      throw error
    }
  }
}

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
  hasNext = true,
  onImageUpload,
  children,
}: MiniatureOverviewModalProps) {
  const { user } = useAuth()
  const { showSuccess, showError } = useNotifications()
  const typeCategoryAdmin = useTypeCategoryAdmin()

  // State declarations
  const [selectedTypes, setSelectedTypes] = useState<SelectedType[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    quantity: 1,
    painted_by_id: 0,
    base_size_id: 0,
    product_set_id: null as number | null,
    material_id: null as number | null,
    types: [] as { id: number, proxy_type: boolean }[],
    tags: [] as { id: number }[]
  })
  const [, setIsLoadingTypes] = useState(false)
  const [typeSearchTerm, setTypeSearchTerm] = useState('')
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [, setDropdownStyle] = useState({ width: 0, left: 0, top: 0 })
  const [selectedTags, setSelectedTags] = useState<Array<{ id: number; name: string }>>([])
  const [tagInput, setTagInput] = useState('')
  const [availableTags, setAvailableTags] = useState<Array<{ id: number; name: string }>>([])
  const [pendingTags, setPendingTags] = useState<string[]>([])
  const [tagDropdownStyle, setTagDropdownStyle] = useState({
    width: 0,
    left: 0,
    top: 0
  })

  // Create the getOrCreateTag function with access to setAvailableTags
  const getOrCreateTag = useMemo(() => createGetOrCreateTag(setAvailableTags), [])

  // Update useEffect to fetch tags to include cache invalidation
  useEffect(() => {
    let mounted = true

    const fetchTags = async () => {
      const { data: tags, error } = await supabase
        .from('tags')
        .select('*')
        .order('name')
      
      if (error) {
        console.error('Error fetching tags:', error)
        return
      }
      
      if (mounted) {
        setAvailableTags(tags || [])
      }
    }
    
    fetchTags()

    // Subscribe to changes in the tags table
    const subscription = supabase
      .channel('tags_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tags' 
        }, 
        () => {
          fetchTags() // Refresh tags when any change occurs
        }
      )
      .subscribe()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Product set state
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageExists, setImageExists] = useState(false)

  // UI state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [, setIsInvalidProductSet] = useState(false)
  const [companyLogo, setCompanyLogo] = useState<string>('')

  const {
    loading: loadingRef,
    error: errorRef,
    paintedByOptions,
    baseSizeOptions,
    companies,
    materials,
    miniTypes,
    getProductLinesByCompany,
    getProductSetsByProductLine
  } = useMiniatureReferenceData()

  const isEditMode = !!miniData

  // Add ref for type search input
  const typeSearchInputRef = useRef<HTMLInputElement>(null)

  // Add refs for each required field
  const nameInputRef = useRef<HTMLInputElement>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const baseSizeSelectRef = useRef<HTMLSelectElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)

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
      const mappedTypes = miniData.types?.map(t => ({
        id: t.type_id,
        proxy_type: t.proxy_type,
        name: t.type.name,
        type: {
          id: t.type.id,
          name: t.type.name,
          categories: t.type.categories
        }
      })) || []

      const mappedTags = miniData.tags?.map(t => ({
        id: t.tag.id,
        name: t.tag.name
      })) || []

      setFormData({
        name: miniData.name || '',
        description: miniData.description || '',
        location: miniData.location || '',
        quantity: miniData.quantity || 1,
        painted_by_id: miniData.painted_by_id || 0,
        base_size_id: miniData.base_size_id || 0,
        product_set_id: miniData.product_set_id || null,
        material_id: miniData.material_id || null,
        types: mappedTypes,
        tags: mappedTags
      })

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
        material_id: null,
        types: [],
        tags: []
      })
      setSelectedTypes([])
      setSelectedTags([])
      setPendingTags([])
      setImageFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      setProductSearchTerm('')
      setTypeSearchTerm('')
      setShowProductDropdown(false)
      setShowTypeDropdown(false)
    }
  }, [isOpen, miniData, previewUrl])

  useEffect(() => {
    if (!miniData && isOpen) {
      const prepaintedId = paintedByOptions.find(p => 
        p.painted_by_name.toLowerCase() === 'prepainted'
      )?.id || 0
      const mediumId = baseSizeOptions.find(b => 
        b.base_size_name.toLowerCase() === 'medium'
      )?.id || 0
      const plasticId = materials.find(m =>
        m.material_name.toLowerCase() === 'plastic'
      )?.id || null

      setFormData(prev => ({
        ...prev,
        painted_by_id: prepaintedId,
        base_size_id: mediumId,
        material_id: plasticId
      }))
    }
  }, [paintedByOptions, baseSizeOptions, materials, miniData, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // console.log('Submit handler started, user:', user)
    
    if (!validateForm()) {
      return
    }

    try {
      // Create any pending tags first
      const newTagIds = await Promise.all(
        pendingTags.map(async (tagName) => {
          const tag = await getOrCreateTag(tagName)
          return tag
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
        material_id: formData.material_id,
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

      let imageUploaded = false;
      let newMiniId: number | undefined;

      try {
        // Save miniature data first before handling image upload
        if (isEditMode && miniData?.id) {
          // console.log('Updating existing miniature:', miniData.id)
          // Store old state before update
          const oldState = {
            ...miniData,
            types: miniData.types || [],
            tags: miniData.tags || []
          }
          
          await updateMiniature(miniData.id, miniatureData)
          
          // Log the update if there's a user
          if (user?.id) {
            // console.log('Logging miniature update:', {
            //   userId: user.id,
            //   miniatureId: miniData.id,
            //   oldState,
            //   newState: miniatureData
            // })
            await AuditService.logMiniatureUpdate(
              user.id,
              miniData.id,
              oldState,
              miniatureData
            )
          } else {
            console.log('No user ID available for audit logging')
          }
        } else {
          // console.log('Creating new miniature')
          const newMini = await createMiniature(miniatureData)
          if (newMini?.id) {
            newMiniId = newMini.id
            // Log the creation if there's a user
            if (user?.id) {
              // console.log('Logging miniature creation:', {
              //   userId: user.id,
              //   miniature: newMini
              // })
              await AuditService.logMiniatureCreate(user.id, newMini)
            } else {
              console.log('No user ID available for audit logging')
            }
          } else {
            throw new Error('Failed to get ID for new miniature')
          }
        }

        // Handle image upload if there's a new image
        if (imageFile) {
          const formData = new FormData()
          formData.append('image', imageFile)
          formData.append('miniId', (newMiniId || miniData?.id || '').toString())
          
          try {
            const response = await fetch('/miniatures/phpscripts/uploadImage.php', {
              method: 'POST',
              body: formData
            })
            
            const responseData = await response.json()
            
            if (!response.ok) {
              console.error('Image upload failed:', responseData)
              throw new Error(responseData.error || 'Failed to upload image')
            }

            imageUploaded = true
            showSuccess('Image uploaded successfully')

            // Log the image operation if there's a user
            if (user?.id) {
              const miniId = newMiniId || miniData?.id
              if (miniId) {
                await AuditService.logImageOperation(
                  user.id,
                  miniId,
                  imageExists ? 'IMAGE_REPLACE' : 'IMAGE_UPLOAD',
                  getMiniImagePath(miniId, 'original'),
                  imageExists ? getMiniImagePath(miniId, 'original') : undefined
                )
              }
            }

            // Force a re-render of the image by updating the image existence state
            setImageExists(false)  // Reset first
            setTimeout(() => {
              setImageExists(true)
              // Verify the image exists
              const img = new Image()
              img.onload = () => {
                setImageExists(true)
              }
              img.onerror = () => {
                console.error('Failed to load new image after upload')
                setImageExists(false)
              }
              img.src = getMiniImagePath(newMiniId || miniData?.id || 0, 'original')
            }, 100)
          } catch (error) {
            console.error('Error uploading image:', error)
            showError(error instanceof Error ? error.message : 'Failed to upload image')
          }
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

        // If we uploaded an image, notify the parent to refresh
        if (imageUploaded) {
          // Give a small delay to ensure the image is processed
          setTimeout(() => {
            if (onImageUpload) {
              onImageUpload();
            }
          }, 200);
        }

      } catch (error) {
        console.error('Error saving miniature:', error)
        if (error instanceof Error) {
          showError(error.message)
        }
      }

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
      setImageFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleImageClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setImageFile(file)
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      }
    }
    input.click()
  }

  const handleTypeSelect = (typeId: number) => {
    const selectedType: MiniType | undefined = typeCategoryAdmin.miniTypes.find(t => t.id === typeId);
    
    if (selectedType && !selectedTypes.some(t => t.id === typeId)) {
      const isFirstType = selectedTypes.length === 0;
      
      const newType: SelectedType = {
        id: typeId,
        proxy_type: !isFirstType,
        name: selectedType.name,
        type: {
          id: selectedType.id,
          name: selectedType.name,
          categories: selectedType.type_to_categories?.map(ttc => ({
            category: {
              id: ttc.mini_categories.id,
              name: ttc.mini_categories.name
            }
          })) || []
        }
      };
      
      setSelectedTypes(prev => [...prev, newType]);
      
      setFormData(prev => ({
        ...prev,
        types: [...prev.types, { id: typeId, proxy_type: !isFirstType }]
      }));
      
      setTypeSearchTerm('');
      setShowTypeDropdown(false);
      
      setTimeout(() => {
        if (typeSearchInputRef.current) {
          typeSearchInputRef.current.focus();
        }
      }, 0);
    }
  };

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

  const handleTypeClick = (typeId: number) => {
    setSelectedTypes(prev => {
      // Mark clicked type as main (proxy_type = false), all others proxy_type = true
      return prev.map(st => ({
        ...st,  // Preserve ALL existing type data including categories
        proxy_type: st.id === typeId ? false : true
      }))
    })
  }

  // First, make sure we're getting the categories from the main type only
  const selectedTypeCategories = useMemo(() => {
    // Get the main type (non-proxy type)
    const mainType = selectedTypes.find(type => !type.proxy_type);
    if (!mainType) return [];

    // Get categories directly from the type object
    return mainType.type?.categories || [];
  }, [selectedTypes]);

  // Sort categories with type safety
  const sortedCategories = useMemo(() => {
    return selectedTypeCategories
      .map(cat => {
        if (!cat.category) {
          return null;
        }
        return {
          id: cat.category.id,
          name: cat.category.name
        };
      })
      .filter((cat): cat is { id: number; name: string } => cat !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedTypeCategories]);

  // Sort tags
  const sortedTags = useMemo(() => {
    return selectedTags
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedTags]);

  // Map sorted categories and tags to items
  const categoryItems = useMemo(() => {
    return sortedCategories.map(category => ({
      id: category.id,
      label: category.name
    }));
  }, [sortedCategories]);

  const tagItems = useMemo(() => {
    return sortedTags.map(tag => ({
      id: tag.id,
      label: tag.name
    }));
  }, [sortedTags]);

  // Search handlers

  const handleTypeSearch = (searchTerm: string) => {
    setTypeSearchTerm(searchTerm)
    setShowTypeDropdown(true)
  }

  // Filter types based on search term
  const filteredTypes: MiniType[] = useMemo(() => {
    const searchTerm = typeSearchTerm.toLowerCase().trim()
    if (!searchTerm) return []
    
    // Use miniTypes directly instead of cache.data?.types
    const allTypes = typeCategoryAdmin.miniTypes
    return allTypes
      .filter(type => {
        const typeName = type.name.toLowerCase().trim()
        const matches = typeName.includes(searchTerm)
        const notSelected = !selectedTypes.some(st => st.id === type.id)
        return matches && notSelected
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [typeSearchTerm, selectedTypes, typeCategoryAdmin.miniTypes])

  // Filter tags based on search term
  const filteredTags = useMemo(() => {
    const searchTerm = tagInput.toLowerCase().trim()
    if (!searchTerm) return availableTags
    
    return availableTags
      .filter(tag => {
        const tagName = tag.name.toLowerCase().trim()
        const matches = tagName.includes(searchTerm)
        const notSelected = !selectedTags.some(st => st.id === tag.id)
        return matches && notSelected
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [tagInput, selectedTags, availableTags])

  // Fetch all types on component mount
  useEffect(() => {
    fetchAllTypes()
  }, [])

  const fetchAllTypes = async () => {
    try {
      setIsLoadingTypes(true);
      
      const { data: typeData, error } = await supabase
        .from('mini_types')
        .select(`
          *,
          type_to_categories(
            mini_categories(
              id,
              name
            )
          )
        `);

      if (error) {
        throw error;
      }

      if (typeData) {
        typeCategoryAdmin.setMiniTypes(typeData);
        return typeData;
      }

      return [];
    } catch (err) {
      console.error('Error in fetchAllTypes:', err);
      return [];
    } finally {
      setIsLoadingTypes(false);
    }
  };

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
        material_id: null,
        types: [],
        tags: []
      })
      setImageFile(null)
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

  // Add this with your other refs
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Add this effect to update dropdown position
  useEffect(() => {
    let mounted = true;

    if (showTypeDropdown && searchContainerRef.current && mounted) {
      const rect = searchContainerRef.current.getBoundingClientRect();
      setDropdownStyle({
        width: rect.width,
        left: rect.left,
        top: (searchContainerRef.current?.getBoundingClientRect()?.bottom ?? 0) + 4,
      });
    }

    return () => {
      mounted = false;
    };
  }, [showTypeDropdown, typeSearchTerm]);

  // Add this with your other refs
  const tagSearchContainerRef = useRef<HTMLDivElement>(null)

  // Add this effect to update tag dropdown position
  useEffect(() => {
    let mounted = true;

    if (tagSearchContainerRef.current && mounted) {
      const rect = tagSearchContainerRef.current.getBoundingClientRect();
      setTagDropdownStyle({
        width: rect.width,
        left: rect.left,
        top: rect.bottom + 4 // 4px gap
      });
    }

    return () => {
      mounted = false;
    };
  }, [tagInput]);

  // Add useEffect to reset search fields when miniId changes
  useEffect(() => {
    let mounted = true;

    if (mounted) {
      // Reset search fields when switching miniatures
      setTypeSearchTerm('');
      setTagInput('');
      setShowTypeDropdown(false);
      setProductSearchTerm('');  // Clear product search term
      setShowProductDropdown(false);  // Hide product dropdown
    }

    return () => {
      mounted = false;
    };
  }, [miniData]); // Add miniData as dependency

  // Update company logo when product set changes or modal opens
  useEffect(() => {
    if (!isOpen) {
      setCompanyLogo('');
      return;
    }

    if (formData.product_set_id) {
      for (const company of companies) {
        const lines = getProductLinesByCompany(company.id)
        for (const line of lines) {
          const sets = getProductSetsByProductLine(line.id)
          const set = sets.find(s => s.id === formData.product_set_id)
          if (set) {
            const logoPath = getCompanyLogoPath(company.name);
            setCompanyLogo(logoPath);
            return;
          }
        }
      }
    } else {
      setCompanyLogo('');
    }
  }, [formData.product_set_id, companies, getProductLinesByCompany, getProductSetsByProductLine, isOpen])

  // Add effect to check if image exists when modal opens or miniData changes
  useEffect(() => {
    // Reset image states when miniature changes
    setImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    // Check if new miniature has an image
    if (miniData?.id) {
      const imagePath = getMiniImagePath(miniData.id, 'original');

      const img = new Image();
      img.onload = () => {
        setImageExists(true);
      };
      img.onerror = (e) => {
        console.error('Image failed to load:', {
          path: imagePath,
          error: e,
          timestamp: new Date().getTime()
        });
        setImageExists(false);
      };
      img.src = imagePath;
    } else {
      setImageExists(false);
    }
  }, [miniData?.id]);

  // Add useEffect to clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (isOpen && !miniData) {
      console.error('Modal opened but no mini data available');
      onClose();
    }
  }, [isOpen, miniData, onClose]);

  // Add cleanup function
  const cleanupImageState = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setImageFile(null);
    setImageExists(false);
  };

  // Update the navigation handlers
  const handlePrevious = () => {
    cleanupImageState();
    onPrevious?.();
  };

  const handleNext = () => {
    cleanupImageState();
    onNext?.();
  };

  // Load all types when modal opens
  useEffect(() => {
    if (isOpen) {
      // Load all types by passing 0, 0 to get the complete dataset
      typeCategoryAdmin.loadData(0, 0)
    }
  }, [isOpen])

  // Add handleDeleteImage function
  const handleDeleteImage = async () => {
    try {
      if (miniData?.id) {
        const oldImageUrl = getMiniImagePath(miniData.id, 'original')
        await deleteImage(miniData.id)
        setImageExists(false)
        if (onImageUpload) {
          onImageUpload()
        }
        showSuccess('Image deleted successfully')
        
        // Log the image deletion if there's a user
        if (user?.id) {
          await AuditService.logImageOperation(
            user.id,
            miniData.id,
            'IMAGE_DELETE',
            undefined,
            oldImageUrl
          )
        }
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      showError('Failed to delete image')
    }
  }

  if (isOpen && !miniData) {
    return (
      <UI.Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-[800px]">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(100vh-8rem)]">
          <UI.ModalHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <div className="text-xl text-blue-600">
                  <FaDiceD6 />
                </div>
                <h2 className="text-xl font-semibold">
                  Add New Miniatureasd
                </h2>
              </div>
            </div>
          </UI.ModalHeader>

          <UI.ModalFooter>
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
                {isLoading ? 'Adding...' : 'Add Miniature'}
              </UI.Button>
            </div>
          </UI.ModalFooter>
        </form>
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
      {/* Update navigation buttons to only show when editing */}
      {miniData?.id && onPrevious && (
        <button
          onClick={handlePrevious}
          disabled={!hasPrevious}
          className="absolute left-[-75px] top-1/2 transform -translate-y-1/2 p-4 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-blue-950/90 hover:bg-blue-900 rounded-xl shadow-2xl shadow-black/50 border border-blue-800/50 hover:border-blue-700 transition-all duration-300 hover:scale-105 hover:-translate-x-1 group disabled:hover:scale-100 disabled:hover:translate-x-0"
          title="Previous miniature"
        >
          <HiOutlineArrowSmallLeft className="w-8 h-8 text-blue-100 opacity-90 group-hover:opacity-100 transition-opacity duration-300 group-disabled:opacity-50" />
        </button>
      )}
      
      {miniData?.id && onNext && (
        <button
          onClick={handleNext}
          disabled={!hasNext}
          className="absolute right-[-75px] top-1/2 transform -translate-y-1/2 p-4 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-blue-950/90 hover:bg-blue-900 rounded-xl shadow-2xl shadow-black/50 border border-blue-800/50 hover:border-blue-700 transition-all duration-300 hover:scale-105 hover:translate-x-1 group disabled:hover:scale-100 disabled:hover:translate-x-0"
          title="Next miniature"
        >
          <HiOutlineArrowSmallRight className="w-8 h-8 text-blue-100 opacity-90 group-hover:opacity-100 transition-opacity duration-300 group-disabled:opacity-50" />
        </button>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(100vh-8rem)]">
        <UI.ModalHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="text-xl text-blue-600">
                <FaDiceD6 />
              </div>
              <h2 className="text-xl font-semibold">
                {miniData?.id ? 'Edit Miniature' : 'Add New Miniature'}
              </h2>
            </div>
            <div className="flex items-center gap-4 p-0">
              {miniData?.id && miniData?.created_at && (
                <div className="italic text-right text-xs text-gray-400">
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
              {miniData?.in_use && (
                <div className="flex items-center gap-1 px-1 py-1 m-0 bg-red-500/30 border border-red-500/20 rounded h-[23px] text-red-500 text-xs">
                  <FaExclamationTriangle className="text-yellow-500 w-4 h-4 ml-1 mr-2" />
                  <span className="text-gray-300">In Use: <span className="text-xs text-gray-400">
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
          {children}
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
                  {(previewUrl || (miniData?.id && imageExists)) ? (
                    <motion.div 
                      key={`image-${miniData?.id || previewUrl}`}
                      className="absolute inset-0 flex items-center justify-center bg-gray-900/50 group"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Add delete button */}
                      {miniData?.id && imageExists && !previewUrl && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage();
                            }}
                            className="absolute top-2 right-2 p-2 bg-red-900/80 hover:bg-red-800 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                            title="Delete image"
                          >
                            <FaTrashAlt className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (miniData.id) {
                                window.open(getMiniImagePath(miniData.id, 'original'), '_blank');
                              }
                            }}
                            className="absolute top-2 left-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white/90 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm z-10"
                            title="View full size"
                          >
                            <FaExpand className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <motion.img
                        initial={{ opacity: 0, scale: 0.3, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                          mass: 0.8
                        }}
                        src={previewUrl || (miniData?.id ? getMiniImagePath(miniData.id, 'original') : '')}
                        alt={miniData?.name || "Preview"}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error('Image display error:', {
                            miniId: miniData?.id,
                            path: e.currentTarget.src,
                            timestamp: new Date().getTime()
                          });
                          setImageExists(false);
                        }}
                        onLoad={(e) => {
                          // Only log and update state if the image source matches what we expect
                          const currentSrc = e.currentTarget.src;
                          const expectedSrc = previewUrl || (miniData?.id ? getMiniImagePath(miniData.id, 'original') : '');
                          if (currentSrc.includes(expectedSrc)) {
                            setImageExists(true);
                          }
                        }}
                      />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="placeholder"
                      data-placeholder
                      className="absolute inset-0 flex flex-col items-center justify-center text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FaDiceD20 className="w-12 h-12 mb-2" />
                      <span className="text-sm">Drop image here or click to select</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2">
                <label className="text-gray-400 w-20">Location:</label>
                <div className="flex-1">
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
                </div>
              </div>

              {/* Base Size */}
              <div className="flex items-center gap-2">
                <label className="text-gray-400 w-20">Base:</label>
                <div className="flex-1">
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
                    {baseSizeOptions.map(size => (
                      <option key={size.id} value={size.id}>
                        {size.base_size_name.charAt(0).toUpperCase() + size.base_size_name.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Material Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-gray-400 w-20">Material:</label>
                <div className="flex-1">
                  <select
                    value={formData.material_id || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null
                      setFormData(prev => ({ ...prev, material_id: value }))
                    }}
                    className="h-10 w-full px-3 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    {materials.map(material => (
                      <option key={material.id} value={material.id}>
                        {material.material_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Painted By Boxes */}
              <div className="flex items-center gap-2">
                <label className="text-gray-400 w-20">Painted:</label>
                <div className="flex gap-1 flex-1">
                  {paintedByOptions.map(painter => (
                    <button
                      key={painter.id}
                      type="button"
                      className={`px-2 py-1 rounded border text-xs ${
                        formData.painted_by_id === painter.id 
                          ? 'border-green-600 bg-green-600/20'
                          : validationErrors.painted_by_id 
                            ? 'border-red-500'
                            : 'border-gray-600 hover:border-gray-500'
                      } transition-colors`}
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
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="relative col-span-10">
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
                  {/* Clear button */}
                  {(selectedProductDisplay || productSearchTerm) && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                      onClick={() => {
                        setProductSearchTerm('')
                        setFormData(prev => ({ ...prev, product_set_id: null }))
                        setShowProductDropdown(false)
                      }}
                    >
                      <FaTimesCircle className="w-4 h-4" />
                    </button>
                  )}
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

                {/* Company Logo with animation */}
                <div className="col-span-2 flex items-center justify-center h-10 relative">
                  <AnimatePresence mode="wait">
                    {companyLogo && (
                      <motion.img 
                        key={companyLogo}
                        src={companyLogo} 
                        alt="Company Logo" 
                        className="max-h-full w-auto object-contain absolute"
                        initial={{ opacity: 0, scale: 0.3, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                          mass: 0.8
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>              
              </div>
              
              {/* Types and Tags grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Types Card */}
                <div className="border border-gray-700 rounded-lg overflow-hidden flex flex-col h-full">
                  <div className="bg-gray-900/80 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="font-medium text-gray-200">Types</h3>
                    <span className="text-xs text-gray-400">
                      {typeSearchTerm ? `${filteredTypes.length} matches` : `${typeCategoryAdmin.miniTypes.length} total types`}
                    </span>
                  </div>
                  <div className="p-4 space-y-3 bg-gray-800 flex-1 min-h-[100px]">
                    <div className="space-y-2">
                      <div className="relative" ref={searchContainerRef}>
                        <UI.SearchInput
                          ref={typeSearchInputRef}
                          value={typeSearchTerm}
                          onChange={(e) => handleTypeSearch(e.target.value)}
                          placeholder="Search types..."
                          className="w-full"
                        />
                        {filteredTypes.length > 0 && createPortal(
                          <div 
                            className="fixed overflow-y-auto border border-gray-700 rounded-md bg-gray-800 shadow-lg scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 h-64 z-[99999]"
                            style={{
                              maxHeight: '400px',
                              width: searchContainerRef.current?.getBoundingClientRect().width,
                              left: searchContainerRef.current?.getBoundingClientRect().left,
                              top: (searchContainerRef.current?.getBoundingClientRect()?.bottom ?? 0) + 4,
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
                          </div>,
                          document.body
                        )}
                      </div>
                    </div>
                    {selectedTypes.length === 0 && (
                      <div className="inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-3xl font-bold text-gray-600/70">No Types Assigned</div>
                      </div>
                    )}
                    {selectedTypes.length > 0 && (
                      <div className="space-y-3">
                        <div className="border border-gray-700 rounded-md bg-gray-900/50">
                          {selectedTypes.map((type, index) => (
                            <div key={`${type.id}-${index}`} className="border-b border-gray-700 last:border-b-0">
                              <div
                                className="flex items-center justify-between px-3 py-1 hover:bg-gray-700 cursor-pointer"
                                onClick={() => handleTypeClick(type.id)}
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
                              hover: 'hover:bg-cyan-700',
                              cursor: 'cursor-default'
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
                  <div className="bg-gray-900/80 px-4 py-3 border-b border-gray-700">
                    <h3 className="font-medium text-gray-200">Tags</h3>
                  </div>
                  <div className="p-4 space-y-3 bg-gray-800 flex-1 min-h-[150px]">
                    <div className="relative" ref={tagSearchContainerRef}>
                      <TagInput
                        value={tagInput}
                        onChange={setTagInput}
                        onTagAdd={handleTagAdd}
                        placeholder="Add tags..."
                        availableTags={filteredTags}
                        onTagSelect={(tag) => {
                          if (!selectedTags.some(t => t.id === tag.id)) {
                            setSelectedTags(prev => [...prev, tag])
                            setFormData(prev => ({
                              ...prev,
                              tags: [...prev.tags || [], { id: tag.id }]
                            }))
                          }
                          setTagInput('') // Clear the input
                          // Focus back on the input
                          const tagInputElement = tagSearchContainerRef.current?.querySelector('input')
                          if (tagInputElement) {
                            tagInputElement.focus()
                          }
                        }}
                        renderDropdown={(filteredTags) => (
                          <div 
                            className="fixed max-h-48 overflow-y-auto border border-gray-700 rounded-md bg-gray-800 shadow-lg scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 z-[9999]"
                            style={{
                              width: tagDropdownStyle.width,
                              left: tagDropdownStyle.left,
                              top: tagDropdownStyle.top,
                              display: filteredTags.length > 0 ? 'block' : 'none'
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
                                  setTagInput('') // Clear the input
                                  // Focus back on the input
                                  const tagInputElement = tagSearchContainerRef.current?.querySelector('input')
                                  if (tagInputElement) {
                                    tagInputElement.focus()
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
                          <div className="text-3xl font-bold text-gray-600/70">No Tags Assigned</div>
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