import { useState, useEffect, useRef, useMemo } from 'react'
import { FaTable, FaDiceD6, FaThLarge, FaDiceD20, FaTimesCircle, FaMinusCircle, FaPlusCircle } from 'react-icons/fa'
import { useMinis } from '../hooks/useMinis'
import * as UI from '../components/ui'
import { ShowItems } from '../components/ShowItems'
import type { Mini, NewMini } from '../types/mini'
import { PageHeader, PageHeaderText, PageHeaderSubText, PageHeaderTextGroup, PageHeaderBigNumber } from '../components/ui/pageheader'
import { getMiniImagePath, getCompanyLogoPath } from '../utils/imageUtils'
import { MiniatureOverviewModal } from '../components/miniatureoverview/MiniatureOverviewModal'
import { useNotifications } from '../contexts/NotificationContext'
import { getMiniature } from '../services/miniatureService'
import { useMiniatureReferenceData } from '../hooks/useMiniatureReferenceData'
import { useViewMode } from '../hooks/useViewMode'
import { AuditService } from '../services/auditService'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useTypeCategoryAdmin } from '../hooks/useTypeCategoryAdmin'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { debounce } from 'lodash'
import { TagInput } from '../components/ui/input/TagInput'
import { OptimisticSwitch } from '../components/ui/OptimisticSwitch'

// Add interface for tag
interface Tag {
  id: number;
  name: string;
}

// Preload images for a given array of minis
const preloadImages = (minis: Mini[]) => {
  minis.forEach(mini => {
    if (mini.id) { // Add null check for mini.id
      const img = new Image()
      img.src = getMiniImagePath(mini.id, 'thumb')
    }
  })
}

export default function MiniatureOverview() {
  const { viewMode, setViewMode, isLoading: viewModeLoading } = useViewMode()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMini, setSelectedMini] = useState<Mini | undefined>(undefined)
  const [selectedMiniIndex, setSelectedMiniIndex] = useState(-1)
  const [allMinis, setAllMinis] = useState<Mini[]>([])
  const [imageTimestamp, setImageTimestamp] = useState(() => Date.now())
  const itemsPerPage = 12
  const initialLoadRef = useRef(true)
  const { user } = useAuth()
  const typeCategoryAdmin = useTypeCategoryAdmin()
  const {
    paintedByOptions,
    baseSizeOptions,
    companies,
    getProductLinesByCompany,
    getProductSetsByProductLine,
    materials: materialOptions = []
  } = useMiniatureReferenceData()
  const [defaultMaterialId, setDefaultMaterialId] = useState<number | null>(null);

  // Add refs for dropdown positioning
  const classicInputRef = useRef<HTMLDivElement>(null)
  const productSetInputRef = useRef<HTMLDivElement>(null)
  const gridInputRef = useRef<HTMLDivElement>(null)
  const tagsInputRef = useRef<HTMLDivElement>(null)

  // Add state for each dropdown approach
  const [typeSearchTermClassic, setTypeSearchTermClassic] = useState('')
  const [showTypeDropdownClassic, setShowTypeDropdownClassic] = useState(false)
  const [selectedTypeClassic, setSelectedTypeClassic] = useState<number | null>(null)

  // Add click outside handlers to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.type-dropdown-container')) {
        // If there's a selected type but no search term, restore the selected type's name
        if (selectedTypeClassic && !typeSearchTermClassic) {
          const selectedType = typeCategoryAdmin.miniTypes.find(t => t.id === selectedTypeClassic)
          if (selectedType) {
            setTypeSearchTermClassic(selectedType.name)
          }
        }
        setShowTypeDropdownClassic(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedTypeClassic, typeSearchTermClassic, typeCategoryAdmin.miniTypes])

  const {
    minis,
    loading,
    error,
    totalMinis,
    totalQuantity,
    getPageMinis,
    getAllMinis,
    setMinis,
    currentPage,
    setCurrentPage,
    setInternalSearchTerm,
    showMissingImages,
    setShowMissingImages,
    handleAdd: handleAddMini,
    handleEdit: handleEditMini,
    handleDelete: handleDeleteMini,
    handleUpdateInUse,
    filteredCount,
    filteredTotalQuantity
  } = useMinis(itemsPerPage);

  const { showSuccess, showError } = useNotifications()

  const [stats, setStats] = useState({
    inUseCount: 0,
    inUsePercentage: '0'
  })

  // Keep the preload effect for adjacent pages
  useEffect(() => {
    if (!loading && totalMinis) {
      // Skip preloading on initial load
      if (initialLoadRef.current) {
        initialLoadRef.current = false
        return
      }

      const totalPages = Math.ceil(totalMinis / itemsPerPage)
      
      // Skip if we don't have any minis yet
      if (minis.length === 0) return

      // Use Promise.all to load both pages in parallel if needed
      const preloadPromises: Promise<void>[] = []
      
      // Preload next page
      if (currentPage < totalPages) {
        preloadPromises.push(
          getPageMinis(currentPage + 1).then(nextPageMinis => {
            preloadImages(nextPageMinis)
          })
        )
      }
      
      // Preload previous page
      if (currentPage > 1) {
        preloadPromises.push(
          getPageMinis(currentPage - 1).then(prevPageMinis => {
            preloadImages(prevPageMinis)
          })
        )
      }

      // Wait for all preloads to complete
      Promise.all(preloadPromises).catch(error => {
        console.error('Error preloading images:', error)
      })
    }
  }, [currentPage, loading, totalMinis, getPageMinis, minis.length])

  // Add useEffect to load all minis when needed
  useEffect(() => {
    let mounted = true;

    if (isModalOpen) {
      const loadAllMinis = async () => {
        try {
          const allMinisData = await getAllMinis();
          if (mounted) {
            setAllMinis(allMinisData.data as Mini[]);
          }
        } catch (error) {
          console.error('Error loading all minis:', error);
        }
      };
      loadAllMinis();
    }

    return () => {
      mounted = false;
    };
  }, [isModalOpen]);

  // Update handleEdit to use the global index
  const handleEdit = async (mini: Mini, localIndex: number) => {
    const globalIndex = (currentPage - 1) * itemsPerPage + localIndex;
    await loadMiniature(mini, globalIndex);
  };

  const handlePrevious = async () => {
    if (selectedMiniIndex > 0 && allMinis.length > 0) {
      const prevMini = allMinis[selectedMiniIndex - 1]
      const newIndex = selectedMiniIndex - 1
      const newPage = Math.floor(newIndex / itemsPerPage) + 1
      
      // Update the current page if it's different
      if (newPage !== currentPage) {
        setCurrentPage(newPage)
        const pageMinis = await getPageMinis(newPage)
        setMinis(pageMinis)
      }
      
      await loadMiniature(prevMini, newIndex)
    }
  }

  const handleNext = async () => {
    if (selectedMiniIndex < allMinis.length - 1 && allMinis.length > 0) {
      const nextMini = allMinis[selectedMiniIndex + 1]
      const newIndex = selectedMiniIndex + 1
      const newPage = Math.floor(newIndex / itemsPerPage) + 1
      
      // Update the current page if it's different
      if (newPage !== currentPage) {
        setCurrentPage(newPage)
        const pageMinis = await getPageMinis(newPage)
        setMinis(pageMinis)
      }
      
      await loadMiniature(nextMini, newIndex)
    }
  }

  // Update keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field
      const activeElement = document.activeElement
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT'
      )) {
        return
      }

      if (isModalOpen) {
        // Handle modal navigation - only in edit mode
        if (selectedMini?.id && selectedMini.id > 0) {  // Add edit mode check
          if (e.key === 'ArrowLeft' && selectedMiniIndex > 0) {
            handlePrevious()
          } else if (e.key === 'ArrowRight' && selectedMiniIndex < allMinis.length - 1) {
            handleNext()
          }
        }
      } else {
        // Handle page navigation
        const maxPage = Math.max(1, Math.ceil((totalMinis || 0) / itemsPerPage))
        
        if (e.key === 'ArrowLeft' && currentPage > 1) {
          const newPage = Math.max(1, currentPage - 1)
          setCurrentPage(newPage)
        } else if (e.key === 'ArrowRight' && currentPage < maxPage) {
          const newPage = Math.min(maxPage, currentPage + 1)
          setCurrentPage(newPage)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalMinis, isModalOpen, selectedMiniIndex, allMinis.length, handlePrevious, handleNext, itemsPerPage, selectedMini])

  const refreshImages = () => setImageTimestamp(Date.now())

  const columnHeaders = [
    'Name',
    'Types',
    'Tags',
    'Product Set',
    'Base Size',
    'Painted By',
    'Location',
    { title: 'QTY', className: 'text-center w-20' },
    { title: 'In Use', className: 'text-center w-20' }
  ]

  const getItemColumns = (mini: Mini) => {
    // Get the main type (proxy_type = false)
    const mainType = mini.types?.find(t => !t.proxy_type)
    // Get proxy types (proxy_type = true)
    const proxyTypes = mini.types?.filter(t => t.proxy_type) || []

    // Create type items array with all types
    const typeItems = [
      // Main type first
      ...(mainType ? [{
        id: mainType.type_id,
        label: mainType.type.name
      }] : []),
      // Then proxy types
      ...proxyTypes.map(t => ({
        id: t.type_id,
        label: t.type.name
      }))
    ]

    const tagNames = mini.tags?.map(t => t.tag?.name).filter(Boolean) || []

    const company = mini.product_sets?.product_line?.company?.name
    const productLine = mini.product_sets?.product_line?.name
    const productSet = mini.product_sets?.name
    const productSetDisplay = mini.product_sets 
      ? (
        <div className="space-y-0.5">
          <div className="text-xs text-gray-300">{company}</div>
          <div className="text-xs text-gray-400">{productLine} <span className="text-gray-200">·</span> <span className="text-gray-200">{productSet}</span></div>
        </div>
      )
      : <span className="text-xs text-gray-500"></span>

    return [
      <div key="name" className="flex items-center gap-4">
        <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-800 flex items-center justify-center">
          <img
            src={`${getMiniImagePath(mini.id ?? 0, 'thumb')}?t=${imageTimestamp}`}
            alt={mini.name}
            data-mini-id={mini.id}
            loading="lazy"
            className="w-full h-full object-cover object-[85%_20%] transition-transform duration-500 scale-120 ease-in-out group-hover:scale-150 opacity-60 group-hover:opacity-100"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
            }}
            onLoad={(e) => {
              e.currentTarget.style.display = 'block'
              e.currentTarget.nextElementSibling?.classList.add('hidden')
            }}
          />
          <FaDiceD20 className="absolute w-6 h-6 text-gray-600 hidden" />
        </div>
        <span>{mini.name}</span>
      </div>,
      <div key="types" className="min-w-[150px] relative overflow-visible">
        <ShowItems 
          items={typeItems} 
          displayType="pills"
          scaleAnimation={true}
          shadowEnabled={true}
          showTooltip={proxyTypes.length > 0}
          tooltipTitle={proxyTypes.length > 0 ? `Proxy Types: ${proxyTypes.map(t => t.type.name).join(', ')}` : undefined}
          itemStyle={{
            text: 'text-gray-200',
            bg: 'bg-orange-900',
            size: 'xs',
            border: '',
            hover: 'hover:bg-orange-800'
          }}
          selectedItem={mainType?.type_id}
          selectedStyle={{
            text: 'text-gray-200',
            bg: 'bg-orange-900',
            border: '',
            hover: 'hover:bg-orange-800',
            indicator: <div className="w-2 h-2 rounded-full bg-green-500" />
          }}
          maxVisible={1}
          emptyMessage="-"
        />
      </div>,
      <div key="tags" className="min-w-[200px] relative overflow-visible">
        <ShowItems 
          items={tagNames} 
          displayType="pills"
          scaleAnimation={true}
          shadowEnabled={true}
          showTooltip={true}
          tooltipTitle="Tags"
          maxPerRow={4}
          itemStyle={{
            text: 'text-gray-200',
            bg: 'bg-gray-700',
            size: 'xs',
            border: 'border border-gray-600',
            hover: 'hover:bg-gray-600'
          }}
          maxVisible={3}
          emptyMessage="-"
        />
      </div>,
      productSetDisplay,
      <div key="base_size" className="text-sm">
        {mini.base_sizes?.base_size_name ? (
          mini.base_sizes.base_size_name.charAt(0).toUpperCase() + mini.base_sizes.base_size_name.slice(1).toLowerCase()
        ) : '-'}
      </div>,
      <div key="painted_by" className="text-sm">
        {mini.painted_by?.painted_by_name ? (
          mini.painted_by.painted_by_name.charAt(0).toUpperCase() + mini.painted_by.painted_by_name.slice(1).toLowerCase()
        ) : '-'}
      </div>,
      <div key="location" className="text-sm">
        {mini.location || '-'}
      </div>,
      <div key="quantity" className="text-center w-[25px]">{mini.quantity || 0}</div>,
      <div 
        key="switch"
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="flex justify-center w-[40px]"
      >
        <OptimisticSwitch
          checked={!!mini.in_use}
          miniId={mini.id}
          onUpdate={handleUpdateInUse}
          className="!border !border-gray-500"
        />
      </div>
    ]
  }

  // Add new state variables at the top of the component
  const [, setDefaultProductSetId] = useState<number | null>(null)
  const [defaultLocation, setDefaultLocation] = useState('')
  const [defaultBaseSizeId, setDefaultBaseSizeId] = useState<number | null>(null)
  const [defaultPaintedById, setDefaultPaintedById] = useState<number | null>(null)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [defaultTypeId, setDefaultTypeId] = useState<number | null>(null)
  const [showPreDefinedFields, setShowPreDefinedFields] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<number[]>([])
  const [selectedProductSet, setSelectedProductSet] = useState<number | null>(null)
  const [productSetFilter, setProductSetFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [paintedByFilter, setPaintedByFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')

  // Add state for immediate values
  const [immediateNameFilter, setImmediateNameFilter] = useState('')
  const [immediateTypeFilter, setImmediateTypeFilter] = useState('')
  const [immediateProductSetFilter, setImmediateProductSetFilter] = useState('')
  const [immediatePaintedByFilter, setImmediatePaintedByFilter] = useState('')
  const [immediateAllTypesFilter, setImmediateAllTypesFilter] = useState('')
  const [allTypesFilter, setAllTypesFilter] = useState('')
  const [selectedTagFilters, setSelectedTagFilters] = useState<Array<{ id: number; name: string }>>([])
  const [tagInput, setTagInput] = useState('')
  const [availableTags, setAvailableTags] = useState<Array<{ id: number; name: string }>>([])

  // Add separate state for predefined tags
  const [defaultTagInput, setDefaultTagInput] = useState('')
  const [defaultTags, setDefaultTags] = useState<Array<{ id: number; name: string }>>([])
  const [showDefaultTagsDropdown, setShowDefaultTagsDropdown] = useState(false)

  // Add filtered tags for predefined tags
  const filteredDefaultTags = useMemo(() => {
    if (!defaultTagInput) return []
    const searchLower = defaultTagInput.toLowerCase()
    return availableTags.filter(tag => 
      tag.name.toLowerCase().includes(searchLower) &&
      !defaultTags.some(dt => dt.id === tag.id)
    ).sort((a, b) => a.name.localeCompare(b.name))
  }, [defaultTagInput, availableTags, defaultTags])

  // Add default tags dropdown
  const defaultTagsDropdown = showDefaultTagsDropdown && filteredDefaultTags.length > 0 && createPortal(
    <div className="fixed inset-0 z-[99999]">
      <div className="fixed inset-0" onClick={() => setShowDefaultTagsDropdown(false)} />
      <div 
        className="fixed z-[99999] overflow-y-auto border border-gray-700 rounded-md bg-gray-800 shadow-lg scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        style={{
          top: `${tagsInputRef.current?.getBoundingClientRect().bottom ?? 0}px`,
          left: `${tagsInputRef.current?.getBoundingClientRect().left ?? 0}px`,
          width: `${tagsInputRef.current?.offsetWidth ?? 0}px`,
          maxHeight: '300px'
        }}
      >
        <div className="flex flex-col">
          {filteredDefaultTags.map((tag) => (
            <button
              key={tag.id}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 text-xs"
              onMouseDown={(e) => {
                e.preventDefault()
                setDefaultTags(prev => [...prev, tag])
                setDefaultTagInput('')
                setShowDefaultTagsDropdown(false)
              }}
            >
              <div className="text-xs text-gray-200 truncate">{tag.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )

  // Create debounced setters
  const debouncedSetNameFilter = useMemo(
    () => debounce((value: string) => setNameFilter(value), 300),
    []
  );

  const debouncedSetTypeFilter = useMemo(
    () => debounce((value: string) => setTypeFilter(value), 300),
    []
  );

  const debouncedSetProductSetFilter = useMemo(
    () => debounce((value: string) => setProductSetFilter(value), 300),
    []
  );

  const debouncedSetPaintedByFilter = useMemo(
    () => debounce((value: string) => setPaintedByFilter(value), 300),
    []
  );

  const debouncedSetAllTypesFilter = useMemo(
    () => debounce((value: string) => setAllTypesFilter(value), 300),
    []
  );

  // Combine filters into a single search string
  useEffect(() => {
    const filters: string[] = [];

    // Only add filters that have values
    if (nameFilter?.trim()) {
      filters.push(`name:${nameFilter.trim()}`);
    }
    if (typeFilter?.trim()) {
      filters.push(`type:${typeFilter.trim()}`);
    }
    if (productSetFilter?.trim()) {
      filters.push(`productset:${productSetFilter.trim()}`);
    }
    if (paintedByFilter?.trim()) {
      filters.push(`paintedby:${paintedByFilter.trim()}`);
    }
    if (allTypesFilter?.trim()) {
      filters.push(`alltype:${allTypesFilter.trim()}`);
    }
    if (selectedTagFilters.length > 0) {
      filters.push(`tags:${selectedTagFilters.map(t => t.name).join(',')}`);
    }

    const combinedSearch = filters.join(' AND ');
    
    // Only update if the search string has actually changed
    setInternalSearchTerm(prevTerm => {
      if (prevTerm !== combinedSearch) {
        // console.log('Updating search term:', combinedSearch);
        return combinedSearch;
      }
      return prevTerm;
    });
    
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [nameFilter, typeFilter, productSetFilter, paintedByFilter, allTypesFilter, selectedTagFilters, setInternalSearchTerm, setCurrentPage]);

  // Initialize default values for base size and painted by
  useEffect(() => {
    const mediumId = baseSizeOptions.find(b => 
      b.base_size_name.toLowerCase() === 'medium'
    )?.id || null;
    
    const prepaintedId = paintedByOptions.find(p => 
      p.painted_by_name.toLowerCase() === 'prepainted'
    )?.id || null;

    setDefaultBaseSizeId(mediumId);
    setDefaultPaintedById(prepaintedId);
  }, [baseSizeOptions, paintedByOptions]);

  // Add filteredProducts computation
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

  // Add logging for typeCategoryAdmin
  useEffect(() => {
    // console.log('typeCategoryAdmin:', typeCategoryAdmin)
    // console.log('miniTypes from typeCategoryAdmin:', typeCategoryAdmin.miniTypes)
  }, [typeCategoryAdmin])

  // Add effect to load all types
  useEffect(() => {
    typeCategoryAdmin.loadData(0, 0).then(() => {
      // Load all types without using the result
    })
  }, [])

  // Classic approach: Direct filtering with memoization
  const filteredTypesClassic = useMemo(() => {
    if (!typeSearchTermClassic) return []
    const searchLower = typeSearchTermClassic.toLowerCase()
    return typeCategoryAdmin.miniTypes.filter(type => 
      type.name.toLowerCase().includes(searchLower)
    ).sort((a, b) => a.name.localeCompare(b.name))
  }, [typeSearchTermClassic, typeCategoryAdmin.miniTypes])

  // Grid approach: Fuzzy search with score-based sorting

  // Three different approaches for type dropdown
  const typeDropdownClassic = showTypeDropdownClassic && filteredTypesClassic.length > 0 && createPortal(
    <div className="fixed inset-0 z-[99999]">
      <div className="fixed inset-0" onClick={() => setShowTypeDropdownClassic(false)} />
      <div 
        className="fixed z-[99999] overflow-y-auto border border-gray-700 rounded-md bg-gray-800 shadow-lg scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        style={{
          top: `${classicInputRef.current?.getBoundingClientRect().bottom ?? 0}px`,
          left: `${classicInputRef.current?.getBoundingClientRect().left ?? 0}px`,
          width: `${classicInputRef.current?.offsetWidth ?? 0}px`,
          maxHeight: '300px'
        }}
      >
        <div className="flex flex-col">
          {filteredTypesClassic.map((type) => (
            <button
              key={type.id}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
              onMouseDown={(e) => {
                e.preventDefault()
                setTypeSearchTermClassic(type.name)
                setSelectedTypeClassic(type.id)
                setDefaultTypeId(type.id)
                setShowTypeDropdownClassic(false)
              }}
            >
              <div className="text-sm text-gray-200 truncate">{type.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )

  // Add effect to update dropdown positions
  useEffect(() => {
    const updateDropdownPosition = () => {
      const updatePosition = (inputRef: React.RefObject<HTMLDivElement>, dropdownType: string) => {
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect()
          document.documentElement.style.setProperty(`--${dropdownType}-dropdown-top`, `${rect.bottom + window.scrollY}px`)
          document.documentElement.style.setProperty(`--${dropdownType}-dropdown-left`, `${rect.left + window.scrollX}px`)
        }
      }

      updatePosition(classicInputRef, 'classic')
      updatePosition(gridInputRef, 'grid')
      updatePosition(tagsInputRef, 'tags')
    }

    updateDropdownPosition()
    window.addEventListener('scroll', updateDropdownPosition)
    window.addEventListener('resize', updateDropdownPosition)

    return () => {
      window.removeEventListener('scroll', updateDropdownPosition)
      window.removeEventListener('resize', updateDropdownPosition)
    }
  }, [])

  // Update handleAdd to use typeCategoryAdmin.miniTypes
  const handleAdd = () => {
    const defaultPaintedBy = paintedByOptions.find(p => p.id === defaultPaintedById);
    const defaultBaseSize = baseSizeOptions.find(b => b.id === defaultBaseSizeId);
    const defaultType = typeCategoryAdmin.miniTypes.find(t => t.id === defaultTypeId);
    const defaultProductSet = selectedProductSet ? {
      id: selectedProductSet,
      name: productSearchTerm
    } : null;

    // Initialize with empty miniature data for new entries
    const newMiniData: NewMini = {
      name: '',
      description: '',
      location: defaultLocation,
      quantity: 1,
      painted_by_id: defaultPaintedById || 0,
      base_size_id: defaultBaseSizeId || 0,
      product_set_id: selectedProductSet || null,
      material_id: defaultMaterialId || null,
      has_image: false,
      types: defaultType ? [{
        mini_id: 0,
        type_id: defaultType.id,
        type: {
          id: defaultType.id,
          name: defaultType.name,
          categories: defaultType.categories || []
        },
        proxy_type: false
      }] : [],
      tags: defaultTags.map(tag => ({
        tag: {
          id: tag.id,
          name: tag.name
        }
      })),
      painted_by: defaultPaintedBy || { id: 0, painted_by_name: '' },
      base_sizes: defaultBaseSize || { id: 0, base_size_name: '' },
      product_sets: defaultProductSet ? {
        id: defaultProductSet.id,
        name: defaultProductSet.name,
        product_line: undefined
      } : undefined
    };

    // Convert to Mini type with temporary values for required fields
    const newMini: Mini = {
      ...newMiniData,
      id: 0, // Temporary ID that will be replaced by the server
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      in_use: null
    };

    setSelectedMini(newMini);
    setSelectedMiniIndex(-1);
    setIsModalOpen(true);
  };

  const loadMiniature = async (mini: Mini, index: number) => {
    try {
      if (!mini.id) return;
      const completeData = await getMiniature(mini.id)
      if (completeData) {
        setSelectedMini(completeData)
        setSelectedMiniIndex(index)
        // Update the current page to match the mini's position
        const newPage = Math.floor(index / itemsPerPage) + 1
        if (newPage !== currentPage) {
          setCurrentPage(newPage)
          const pageMinis = await getPageMinis(newPage)
          setMinis(pageMinis)
        }
        
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error('Error fetching complete mini data:', error)
      showError('Failed to load miniature data')
    }
  }

  const handleSave = async (miniatureData?: Partial<Mini>) => {
    try {
      if (!miniatureData) return;

      let savedMini: Mini | undefined;

      if (selectedMini?.id) {
        // Edit existing mini
        await handleEditMini(selectedMini.id, miniatureData);
        savedMini = await getMiniature(selectedMini.id);
      } else {
        // Add new mini
        const newMini = await handleAddMini(miniatureData);
        if (newMini?.id) {
          savedMini = await getMiniature(newMini.id);
        }
      }

      setIsModalOpen(false);
      setSelectedMini(undefined);

      // Refresh images
      refreshImages();

      return savedMini;
    } catch (error) {
      console.error('Error saving miniature:', error);
      showError('Failed to save miniature');
      throw error;
    }
  };

  const handleDelete = async (miniId: number) => {
    try {
      // Get the miniature data before deletion for logging
      const miniatureData = await getMiniature(miniId);
      
      // Log the deletion first if there's a user
      if (user?.id && miniatureData) {
        await AuditService.logMiniatureDelete(
          user.id,
          miniId,
          miniatureData
        );
      }

      // Delete the miniature with optimistic update
      await handleDeleteMini(miniId);

      // Refresh images
      refreshImages();
      
      showSuccess('Miniature deleted successfully');
    } catch (error) {
      console.error('Error deleting miniature:', error);
      showError('Failed to delete miniature');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMini(undefined)
  }

  const handlePreviousMini = () => {
    handlePrevious()
  }

  const handleNextMini = () => {
    handleNext()
  }

  const hasPreviousMini = selectedMiniIndex > 0
  const hasNextMini = selectedMiniIndex < allMinis.length - 1

  // Add useEffect to fetch stats
  useEffect(() => {
    fetchData();
  }, [minis]); // Re-fetch when minis change

  const fetchData = async () => {
    try {
      const [totalResponse, inUseResponse] = await Promise.all([
        supabase.from('minis').select('id'),
        supabase.from('minis').select('id').not('in_use', 'is', null),
      ]);

      const totalCount = totalResponse.data?.length || 0;
      const inUseCount = inUseResponse.data?.length || 0;

      setStats(prev => ({
        ...prev,
        inUseCount,
        inUsePercentage: totalCount > 0 ? ((inUseCount / totalCount) * 100).toFixed(1) : '0'
      }));
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  useEffect(() => {
    if (materialOptions.length > 0) {
      const plasticMaterial = materialOptions.find(m => m.material_name.toLowerCase() === 'plastic');
      if (plasticMaterial && !defaultMaterialId) {
        setDefaultMaterialId(plasticMaterial.id);
      }
    }
  }, [materialOptions, defaultMaterialId]);

  // Add effect to load available tags
  useEffect(() => {
    const loadTags = async () => {
      const { data: tags, error } = await supabase
        .from('tags')
        .select('id, name')
        .order('name')
      
      if (error) {
        console.error('Error loading tags:', error)
        return
      }

      if (tags) {
        setAvailableTags(tags)
      }
    }

    loadTags()
  }, [])

  // Add product dropdown implementation
  const productDropdown = showProductDropdown && filteredProducts.length > 0 && createPortal(
    <div className="fixed inset-0 z-[99999]">
      <div className="fixed inset-0" onClick={() => setShowProductDropdown(false)} />
      <div 
        className="fixed z-[99999] overflow-y-auto border border-gray-700 rounded-md bg-gray-800 shadow-lg scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        style={{
          top: `${productSetInputRef.current?.getBoundingClientRect().bottom ?? 0}px`,
          left: `${productSetInputRef.current?.getBoundingClientRect().left ?? 0}px`,
          width: `${(productSetInputRef.current?.offsetWidth ?? 0) * 2}px`,
          maxHeight: '300px'
        }}
      >
        <div className="flex flex-col">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 text-xs"
              onMouseDown={(e) => {
                e.preventDefault()
                setSelectedProductSet(product.id)
                setProductSearchTerm(`${product.company} - ${product.line} - ${product.set}`)
                setDefaultProductSetId(product.id)
                setShowProductDropdown(false)
              }}
            >
              <div className="text-xs font-medium text-gray-200 truncate">{product.company} - {product.line}</div>
              <div className="text-xs text-gray-400 truncate">{product.set}</div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )

  // Add isFiltering calculation
  const isFiltering = !!(nameFilter || typeFilter || productSetFilter || paintedByFilter || allTypesFilter || selectedTagFilters.length > 0 || showMissingImages);

  // Early return while loading view mode to prevent flash
  if (viewModeLoading || !viewMode) {
    return (
      <div className="flex items-center justify-center h-screen">
        <UI.LoadingSpinner message="Loading view preferences..." />
      </div>
    )
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return <div className="p-4 text-red-500">Error: {errorMessage}</div>
  }

  return (
    <>
      <PageHeader bgColor="none">
        <PageHeaderTextGroup>
          <PageHeaderText>
            <div className="flex items-center gap-2">
              <FaDiceD6 className="w-6 h-6" />
              Miniature Overview
            </div>
          </PageHeaderText>
          <PageHeaderSubText>
            View and manage your miniature collection
          </PageHeaderSubText>
        </PageHeaderTextGroup>
        <PageHeaderBigNumber
          icon={FaDiceD6}
          number={loading ? '-' : totalMinis}
          text="Unique Miniatures"
          filteredCount={isFiltering ? filteredCount : undefined}
          isFiltering={isFiltering}
        />
        <PageHeaderBigNumber
          icon={FaDiceD6}
          number={loading ? '-' : totalQuantity}
          text="Total Miniatures"
          filteredCount={isFiltering ? filteredTotalQuantity : undefined}
          isFiltering={isFiltering}
        />
        <PageHeaderBigNumber
          icon={FaDiceD6}
          number={loading ? '-' : stats.inUseCount}
          text="In Use"
          isFiltering={false}
        />
      </PageHeader>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <UI.Card>
            <UI.CardHeader>
              <div className="flex">
                <UI.CardIcon size="big" className="text-white">
                  <FaDiceD6 />
                </UI.CardIcon>
                <div>
                  <UI.CardHeaderText>
                    Miniatures
                  </UI.CardHeaderText>
                  <UI.CardHeaderSubText>
                    Manage your miniature collection
                  </UI.CardHeaderSubText>
                  <UI.CardHeaderItalicText>
                    Add, edit, and delete miniatures from your collection
                  </UI.CardHeaderItalicText>
                </div>
              </div>
              <UI.CardHeaderRightSide>
                <div className="flex flex-col gap-4 h-[50px] text-justify justify-center">
                <div className="flex items-center gap-4">
                    {/* Pre-defined fields for new miniature */}
                    <div className="flex items-center gap-4 bg-gray-800/50 p-2 pl-5 pr-5 rounded-lg border border-gray-700">Fields
                      <button
                        onClick={() => {
                          setShowPreDefinedFields(!showPreDefinedFields);
                          // If we're closing, reset all values
                          if (showPreDefinedFields) {
                            // Reset product set
                            setDefaultProductSetId(null);
                            setProductSearchTerm('');
                            setShowProductDropdown(false);
                            
                            // Reset location
                            setDefaultLocation('');
                            
                            // Reset base size to "medium"
                            const mediumId = baseSizeOptions.find(b => 
                              b.base_size_name.toLowerCase() === 'medium'
                            )?.id || null;
                            setDefaultBaseSizeId(mediumId);
                            
                            // Reset painted by to "prepainted"
                            const prepaintedId = paintedByOptions.find(p => 
                              p.painted_by_name.toLowerCase() === 'prepainted'
                            )?.id || null;
                            setDefaultPaintedById(prepaintedId);

                            // Reset material to "plastic"
                            const plasticId = materialOptions.find(m => 
                              m.material_name.toLowerCase() === 'plastic'
                            )?.id || null;
                            setDefaultMaterialId(plasticId);
                            
                            // Reset type
                            setDefaultTypeId(null);
                            setTypeSearchTermClassic('');
                            setShowTypeDropdownClassic(false);
                            setSelectedTypeClassic(null);  // Add this line
                            setSelectedTypes([]);  // Add this line

                            // Reset default tags
                            setDefaultTags([]);
                            setDefaultTagInput('');
                            setShowDefaultTagsDropdown(false);
                          }
                        }}
                        className="text-gray-400 hover:text-gray-300 focus:outline-none"
                      >
                        {showPreDefinedFields ? (
                          <span className="flex items-center gap-2"><FaMinusCircle className="w-4 h-4 text-orange-500" /></span>
                        ) : (
                          <span className="flex items-center gap-2"><FaPlusCircle className="w-4 h-4 text-green-500" /></span>
                        )}
                      </button>
                      <AnimatePresence>
                        {showPreDefinedFields && (
                          <motion.div 
                            initial={{ width: 0, height: 0, scale: 0.98, opacity: 0 }}
                            animate={{ width: "auto", height: "auto", scale: 1, opacity: 1 }}
                            exit={{ width: 0, height: 0, scale: 0.98, opacity: 0 }}
                            transition={{ 
                              duration: 0.5,
                              opacity: { duration: 0.2 },
                              height: { type: "spring", bounce: 0.1, duration: 0.5 },
                              width: { type: "spring", bounce: 0.1, duration: 0.5 },
                              scale: { type: "spring", bounce: 0.1, duration: 0.5 }
                            }}
                            className="overflow-hidden origin-left"
                          >
                            <div className="flex items-center gap-4">
                              {/* Type Inputs - Three Different Approaches */}
                              <div className="flex gap-4">
                                {/* Classic Approach */}
                                <div className="relative group type-dropdown-container z-[99999]">
                                  <div className="relative" ref={classicInputRef}>
                                    <UI.SearchInput
                                      value={typeSearchTermClassic}
                                      onChange={(e) => {
                                        setTypeSearchTermClassic(e.target.value)
                                        setShowTypeDropdownClassic(true)
                                        if (selectedTypes.length > 0) {
                                          setSelectedTypes([])
                                        }
                                      }}
                                      onFocus={() => setShowTypeDropdownClassic(true)}
                                      placeholder="Type..."
                                      className="w-32 text-xs"
                                    />
                                    {typeDropdownClassic}
                                    {selectedTypeClassic && (
                                      <button
                                        onClick={() => {
                                          setSelectedTypeClassic(null)
                                          setTypeSearchTermClassic('')
                                          setDefaultTypeId(null)
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                      >
                                        <FaTimesCircle className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Product Set */}
                              <div className="relative group product-dropdown-container z-[99999]">
                                <div className="relative" ref={productSetInputRef}>
                                  <UI.SearchInput
                                    value={productSearchTerm}
                                    onChange={(e) => {
                                      setProductSearchTerm(e.target.value)
                                      setShowProductDropdown(true)
                                      if (selectedProductSet) {
                                        setSelectedProductSet(null)
                                      }
                                    }}
                                    onFocus={() => setShowProductDropdown(true)}
                                    placeholder="Product..."
                                    className="w-32 text-xs"
                                  />
                                  {productDropdown}
                                  {selectedProductSet && (
                                    <button
                                      onClick={() => {
                                        setSelectedProductSet(null)
                                        setProductSearchTerm('')
                                        setDefaultProductSetId(null)
                                      }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                    >
                                      <FaTimesCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Painted By */}
                              <select
                                value={defaultPaintedById || ''}
                                onChange={(e) => setDefaultPaintedById(e.target.value ? Number(e.target.value) : null)}
                                className="w-32 text-xs bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 py-0 pb-0 h-10"
                              >
                                {paintedByOptions.map((painter) => (
                                  <option key={painter.id} value={painter.id}>
                                    {painter.painted_by_name.charAt(0).toUpperCase() + painter.painted_by_name.slice(1).toLowerCase()}
                                  </option>
                                ))}
                              </select>

                              {/* Tags */}
                              <div className="relative group tags-dropdown-container z-[99999]">
                                <div className="relative" ref={tagsInputRef}>
                                  <UI.SearchInput
                                    value={defaultTagInput}
                                    onChange={(e) => {
                                      setDefaultTagInput(e.target.value)
                                      setShowDefaultTagsDropdown(true)
                                    }}
                                    onFocus={() => setShowDefaultTagsDropdown(true)}
                                    placeholder="Tags..."
                                    className="w-32 text-xs"
                                  />
                                  {defaultTagsDropdown}
                                </div>
                                {defaultTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 fixed border border-gray-600 bg-gray-800 p-2 mt-[-65px] animate-fade-in">
                                  {defaultTags.map(tag => (
                                    <div
                                      key={tag.id}
                                      className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-200 text-xs rounded-full border border-gray-600"
                                    >
                                      {tag.name}
                                      <button
                                        onClick={() => {
                                          setDefaultTags(prev => prev.filter(t => t.id !== tag.id))
                                        }}
                                        className="text-gray-400 hover:text-gray-300"
                                      >
                                        <FaTimesCircle className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                )}
                              </div>

                              {/* Base Size */}
                              <select
                                value={defaultBaseSizeId || ''}
                                onChange={(e) => setDefaultBaseSizeId(e.target.value ? Number(e.target.value) : null)}
                                className="w-32 text-xs bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 py-0 pb-0 h-10"
                              >
                                {baseSizeOptions.map((size) => (
                                  <option key={size.id} value={size.id}>
                                    {size.base_size_name.charAt(0).toUpperCase() + size.base_size_name.slice(1).toLowerCase()}
                                  </option>
                                ))}
                              </select>

                              {/* Material */}
                              <select
                                value={defaultMaterialId || ''}
                                onChange={(e) => setDefaultMaterialId(e.target.value ? Number(e.target.value) : null)}
                                className="w-32 text-xs bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 py-0 pb-0 h-10"
                              >
                                {materialOptions.map((material) => (
                                  <option key={material.id} value={material.id}>
                                    {material.material_name.charAt(0).toUpperCase() + material.material_name.slice(1).toLowerCase()}
                                  </option>
                                ))}
                              </select>

                              {/* Location */}
                              <UI.SearchInput
                                value={defaultLocation}
                                onChange={(e) => setDefaultLocation(e.target.value)}
                                placeholder="Location..."
                                className="w-32 text-xs"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <UI.Button 
                      variant="btnSuccess"
                      onClick={handleAdd}
                      disabled={loading}
                    >
                      + Add Miniature
                    </UI.Button>
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1 ml-auto">
                    <button
                      className={`p-2 rounded focus:outline-none ${viewMode === 'table' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                      onClick={() => setViewMode('table')}
                      title="Table View"
                      tabIndex={-1}
                    >
                      <FaTable className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 rounded focus:outline-none ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                      onClick={() => setViewMode('grid')}
                      title="Card View"
                      tabIndex={-1}
                    >
                      <FaThLarge className="w-4 h-4" />
                    </button>
                  </div>
                  </div>
                </div>
              </UI.CardHeaderRightSide>
            </UI.CardHeader>

            <UI.CardBody className="pl-0">
              {/* Filter Section */}
              <div className="flex flex-wrap gap-1">
                {/* Name Search */}
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-300 text-right pl-4 pr-3">Name:</label>
                  <div className="relative">
                    <UI.SearchInput
                      value={immediateNameFilter}
                      onChange={(e) => {
                        const value = e.target.value
                        setImmediateNameFilter(value)
                        debouncedSetNameFilter(value)
                        setCurrentPage(1)
                      }}
                      placeholder="Name..."
                      className="w-[80px]"
                    />
                    {immediateNameFilter && (
                      <button
                        onClick={() => {
                          setImmediateNameFilter('')
                          setNameFilter('')
                          setCurrentPage(1)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        <FaTimesCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Type Filter */}
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-300 text-right pl-3 pr-3">Main Type:</label>
                  <div className="relative">
                    <UI.SearchInput
                      value={immediateTypeFilter}
                      onChange={(e) => {
                        const value = e.target.value
                        setImmediateTypeFilter(value)
                        debouncedSetTypeFilter(value)
                        setCurrentPage(1)
                      }}
                      placeholder="Main type..."
                      className="w-[80px]"
                    />
                    {immediateTypeFilter && (
                      <button
                        onClick={() => {
                          setImmediateTypeFilter('')
                          setTypeFilter('')
                          setCurrentPage(1)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        <FaTimesCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Add All Types Filter */}
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-300 text-right pl-3 pr-3">All Types:</label>
                  <div className="relative">
                    <UI.SearchInput
                      value={immediateAllTypesFilter}
                      onChange={(e) => {
                        const value = e.target.value
                        setImmediateAllTypesFilter(value)
                        debouncedSetAllTypesFilter(value)
                        setCurrentPage(1)
                      }}
                      placeholder="All types..."
                      className="w-[80px]"
                    />
                    {immediateAllTypesFilter && (
                      <button
                        onClick={() => {
                          setImmediateAllTypesFilter('')
                          setAllTypesFilter('')
                          setCurrentPage(1)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        <FaTimesCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Product Set Filter */}
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-300 text-right pl-3 pr-3">Product:</label>
                  <div className="relative">
                    <UI.SearchInput
                      value={immediateProductSetFilter}
                      onChange={(e) => {
                        const value = e.target.value
                        setImmediateProductSetFilter(value)
                        debouncedSetProductSetFilter(value)
                        setCurrentPage(1)
                      }}
                      placeholder="Product set..."
                      className="w-[100px]"
                    />
                    {immediateProductSetFilter && (
                      <button
                        onClick={() => {
                          setImmediateProductSetFilter('')
                          setProductSetFilter('')
                          setCurrentPage(1)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        <FaTimesCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Painted By Filter */}
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-300 text-right pl-3 pr-3">Paint:</label>
                  <select
                    value={immediatePaintedByFilter}
                    onChange={(e) => {
                      const value = e.target.value
                      setImmediatePaintedByFilter(value)
                      debouncedSetPaintedByFilter(value)
                      setCurrentPage(1)
                    }}
                    className="w-[90px] bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 h-10"
                  >
                    <option value="">All</option>
                    {paintedByOptions.map((option) => (
                      <option key={option.id} value={option.painted_by_name}>
                        {option.painted_by_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Add Tag Filter */}
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-300 text-right pl-3 pr-3">Tags:</label>
                  <div className="relative flex items-center gap-2">
                    <div className="w-[75px]">
                      <TagInput
                        value={tagInput}
                        onChange={setTagInput}
                        placeholder="Add tags..."
                        availableTags={availableTags.filter(tag => !selectedTagFilters.some(st => st.id === tag.id))}
                        onTagSelect={(tag: Tag) => {
                          setSelectedTagFilters(prev => [...prev, tag])
                          setCurrentPage(1)
                        }}
                        renderDropdown={(filteredTags: Tag[]) => (
                          <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-gray-800 border border-gray-700 rounded-md shadow-lg scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                            {filteredTags.map((tag: Tag) => (
                              <button
                                key={tag.id}
                                className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700"
                                onClick={() => {
                                  setSelectedTagFilters(prev => [...prev, tag])
                                  setTagInput('')
                                  setCurrentPage(1)
                                }}
                              >
                                {tag.name}
                              </button>
                            ))}
                          </div>
                        )}
                      />
                    </div>
                    {selectedTagFilters.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        {selectedTagFilters.map(tag => (
                          <div
                            key={tag.id}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-200 text-xs rounded-full border border-gray-600"
                          >
                            {tag.name}
                            <button
                              onClick={() => {
                                setSelectedTagFilters(prev => prev.filter(t => t.id !== tag.id))
                                setCurrentPage(1)
                              }}
                              className="text-gray-400 hover:text-gray-300"
                            >
                              <FaTimesCircle className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reset Filters Button and Missing Images Filter */}
                <div className="flex items-center ml-auto pr-0 gap-4">
                  {/* Missing Images Filter */}
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input
                      type="checkbox"
                      checked={showMissingImages}
                      onChange={(e) => {
                        setShowMissingImages(e.target.checked)
                        setCurrentPage(1)
                      }}
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-500 bg-gray-700 focus:ring-blue-500"
                    />
                    Missing Images
                  </label>

                  <UI.Button
                    variant="btnPrimary"
                    size="sm"
                    onClick={() => {
                      setImmediateNameFilter('')
                      setImmediateTypeFilter('')
                      setImmediateProductSetFilter('')
                      setImmediatePaintedByFilter('')
                      setImmediateAllTypesFilter('')
                      setNameFilter('')
                      setTypeFilter('')
                      setProductSetFilter('')
                      setPaintedByFilter('')
                      setAllTypesFilter('')
                      setSelectedTagFilters([])
                      setTagInput('')
                      setShowMissingImages(false)
                      setCurrentPage(1)
                    }}
                    className="text-sm py-2"
                  >
                    Reset Filters
                  </UI.Button>
                </div>
              </div>

              {/* Content Section */}
              <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
                {minis.length === 0 ? (
                  <UI.EmptyTableState icon={<FaDiceD6 />} message="No miniatures found" />
                ) : viewMode === 'table' ? (
                  <div className="overflow-x-auto overflow-y-auto h-[calc(92vh-23rem)] mt-4">
                    <table className="w-full divide-y divide-[#333333]">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          {columnHeaders.map((header, index) => (
                            <th
                              key={index}
                              className={`px-6 py-2 bgTableHeader text-left text-xs font-medium text-gray-300 uppercase tracking-wider ${
                                typeof header === 'object' ? header.className : ''
                              }`}
                            >
                              {typeof header === 'object' ? header.title : header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bgCardBody divide-y divide-[#333333]">
                        {minis.map((mini, index) => (
                          <tr
                            key={mini.id}
                            className={`
                              ${mini.in_use ? 'bg-red-900/50' : 'bgRow'} 
                              group
                              hover:bgRowHover hover:-translate-x-[2px]
                              hover:shadow-[0_0_12px_rgba(0,0,0,0.3)] hover:relative hover:z-10
                              transition-all duration-200 ease-in-out transform
                              cursor-pointer

                            `}
                            onClick={() => handleEdit(mini, index)}
                          >
                            {getItemColumns(mini).map((column, columnIndex) => (
                              <td
                                key={columnIndex}
                                className="px-6 py-1.5 text-sm text-gray-300 transition-colors duration-200 group-hover:text-gray-100"
                              >
                                {column}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-4 auto-rows-fr gap-2 h-[calc(94vh-25rem)] overflow-y-none p-3 pr-0 pb-0">
                    {minis.map((mini, index) => {
                      const originalPath = `${getMiniImagePath(mini.id ?? 0, 'original')}?t=${imageTimestamp}`
                      const company = mini.product_sets?.product_line?.company?.name
                      const productLine = mini.product_sets?.product_line?.name
                      const productSet = mini.product_sets?.name
                      const baseSize = mini.base_sizes?.base_size_name || 'Unknown size'
                      const paintedBy = mini.painted_by?.painted_by_name || 'Unknown'
                      const quantity = mini.quantity || 0

                      const rotation = (Math.sin((mini.id ?? 0) * 0.7) + Math.cos((mini.id ?? 0) * 1.3)) > 0 ? 
                        1 + Math.abs(Math.sin(mini.id ?? 0)) : 
                        -2 + Math.abs(Math.sin(mini.id ?? 0));

                      return (
                        <div 
                          key={mini.id} 
                          className="group relative w-full h-full bgCardBody rounded-lg border border-gray-700 shadow-md overflow-hidden cursor-pointer transition-all duration-300 ease-in-out hover:border-gray-500 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]"
                          style={{ 
                            transform: `rotate(0deg)`,
                            '--card-rotation': `${rotation}deg`
                          } as React.CSSProperties}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = `rotate(${rotation}deg)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'rotate(0deg)';
                          }}
                          onClick={() => handleEdit(mini, index)}
                        >
                          {/* Image Container with Overlay */}
                          <div className="absolute inset-0 bg-gray-800">
                            <img
                              src={originalPath}
                              alt={mini.name}
                              data-mini-id={mini.id}
                              className="w-full h-full object-cover object-[85%_20%] transition-transform duration-500 scale-120 ease-in-out group-hover:scale-150 opacity-60 group-hover:opacity-100"
                              onError={(e) => {
                                e.currentTarget.onerror = null
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                              onLoad={(e) => {
                                e.currentTarget.style.display = 'block'
                                e.currentTarget.nextElementSibling?.classList.add('hidden')
                              }}
                            />
                            <FaDiceD20 className="absolute inset-0 m-auto w-12 h-12 text-gray-600 hidden" />
                            {/* Vignette Effect */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_70%,rgba(0,0,0,0.8)_100%)]" />
                          </div>

                          {/* Content Overlay */}
                          <div className="absolute inset-0 p-3 m-0 flex flex-col min-h-0">
                            {/* Top Row - Fixed height */}
                            <div className="flex-none relative">
                              <div className="flex flex-col gap-1.5 max-w-[90%]">
                                <h3 className="font-bold text-gray-100 text-base leading-tight line-clamp-2">
                                  {mini.name}
                                </h3>
                              </div>
                              {quantity > 1 ? (
                                <div className="absolute top-0 right-0 flex-none bg-blue-700/80 backdrop-blur-sm px-2 py-0.5 pb-1 rounded-full text-md text-gray-100 border border-blue-700/50">
                                  {quantity}
                                </div>
                              ) : null}
                            </div>

                            {/* Middle Content - Scrollable if needed */}
                            <div className="flex-1 min-h-0 mt-1 mb-2">
                              {mini.product_sets && (
                                <>
                                  {company && (
                                    <div className="flex flex-col items-start gap-1 mt-0 mb-1.5">
                                      <img
                                        src={getCompanyLogoPath(company)}
                                        alt={company}
                                        className="h-6 w-auto object-contain opacity-90 mb-0.5"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      <p className="text-blue-400 text-xs m-0 p-0">{company}
                                      {productLine && productSet && (
                                        productLine.toLowerCase() === productSet.toLowerCase() ? (
                                          <span className="block text-gray-300 text-xs truncate">
                                            {productSet}
                                          </span>
                                        ) : (
                                          <>
                                            <span className="block text-gray-300 text-xs truncate">
                                              {productLine}
                                            </span>
                                            <span className="block text-gray-300 text-xs truncate">
                                              {productSet}
                                            </span>
                                          </>
                                        )
                                      )}
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Bottom Row - Fixed height */}
                            <div className="flex-none flex justify-between items-end mt-1.5">
                              <div className="space-y-0.5">
                              {mini.types && (
                                  <div className="flex items-center mb-2">
                                    <ShowItems 
                                      items={[
                                        // Main type first
                                        ...(mini.types.find(t => !t.proxy_type) ? [{
                                          id: mini.types.find(t => !t.proxy_type)!.type_id,
                                          label: mini.types.find(t => !t.proxy_type)!.type.name
                                        }] : []),
                                        // Then proxy types
                                        ...mini.types.filter(t => t.proxy_type).map(t => ({
                                          id: t.type_id,
                                          label: t.type.name
                                        }))
                                      ]}
                                      displayType="pills"
                                      scaleAnimation={true}
                                      shadowEnabled={true}
                                      showTooltip={true}
                                      tooltipTitle="Types:"
                                      itemStyle={{
                                        text: 'text-gray-200',
                                        bg: 'bg-orange-900',
                                        size: 'xs',
                                        border: '',
                                        hover: 'hover:bg-orange-800'
                                      }}
                                      selectedItem={mini.types.find(t => !t.proxy_type)?.type_id}
                                      selectedStyle={{
                                        text: 'text-gray-200',
                                        bg: 'bg-orange-900',
                                        border: '',
                                        hover: 'hover:bg-orange-800',
                                        indicator: <div className="w-2 h-2 rounded-full bg-green-500" />
                                      }}
                                      maxVisible={1}
                                      emptyMessage=""
                                    />
                                  </div>
                                )}                                
                                <p className="text-xs text-gray-400">
                                  <span className="text-gray-500">Base:</span> {baseSize.charAt(0).toUpperCase() + baseSize.slice(1).toLowerCase()}
                                </p>
                                <p className="text-xs text-gray-400">
                                  <span className="text-gray-500">Material:</span> {mini.material?.material_name || 'No Material'}
                                </p>  
                                <p className="text-xs text-gray-400">
                                  <span className="text-gray-500">By:</span> {paintedBy.charAt(0).toUpperCase() + paintedBy.slice(1).toLowerCase()}
                                </p>
                              </div>
                              {mini.in_use && (
                                <div className="bg-red-900/80 backdrop-blur-sm px-2 py-0.5 pb-1 rounded-lg text-xs text-gray-200 border border-red-700/50 flex items-center gap-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                  <span className="ml-1">In Use</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </UI.CardBody>
          </UI.Card>

          {minis.length > 0 && (
            <div className="mt-4">
              <UI.Pagination
                currentPage={currentPage}
                totalItems={filteredCount > 0 ? filteredCount : (totalMinis || 0)}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => {
                  setCurrentPage(page)
                }}
                disabled={loading}
              />
            </div>
          )}
        </div>
      </div>

      <MiniatureOverviewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        miniData={selectedMini}
        onSave={handleSave}
        onDelete={handleDelete}
        isLoading={loading}
        onPrevious={handlePreviousMini}
        onNext={handleNextMini}
        hasPrevious={hasPreviousMini}
        hasNext={hasNextMini}
        onImageUpload={refreshImages}
      />
    </>
  )
} 