import { useState, useEffect, useRef } from 'react'
import { FaTable, FaDiceD6, FaThLarge, FaShareAltSquare, FaDiceD20 } from 'react-icons/fa'
import { useMinis } from '../hooks/useMinis'
import { useAdminSearch } from '../hooks'
import * as UI from '../components/ui'
import { ShowItems } from '../components/ShowItems'
import type { Mini } from '../types/mini'
import { PageHeader, PageHeaderText, PageHeaderSubText, PageHeaderTextGroup, PageHeaderBigNumber } from '../components/ui'
import { getMiniImagePath, getCompanyLogoPath } from '../utils/imageUtils'
import { MiniatureOverviewModal } from '../components/miniatureoverview/MiniatureOverviewModal'
import { useNotifications } from '../contexts/NotificationContext'
import { deleteMiniature, getMiniature, updateMiniatureInUse } from '../services/miniatureService'
import { Switch } from '../components/ui'
import { useMiniatureReferenceData } from '../hooks/useMiniatureReferenceData'
import { useViewMode, ViewMode } from '../hooks/useViewMode'

// Preload images for a given array of minis
const preloadImages = (minis: Mini[]) => {
  minis.forEach(mini => {
    const img = new Image()
    img.src = getMiniImagePath(mini.id, 'thumb')
  })
}

export default function MiniatureOverview() {
  const { viewMode, setViewMode, isLoading: viewModeLoading } = useViewMode()
  const miniSearch = useAdminSearch({ searchFields: ['name'] })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMini, setSelectedMini] = useState<Mini | undefined>(undefined)
  const [selectedMiniIndex, setSelectedMiniIndex] = useState(-1)
  const [allMinis, setAllMinis] = useState<Mini[]>([])
  const [imageTimestamp, setImageTimestamp] = useState(() => Date.now())
  const itemsPerPage = 12
  const initialLoadRef = useRef(true)

  const {
    paintedByOptions,
    baseSizeOptions,
  } = useMiniatureReferenceData()

  const {
    minis, 
    loading, 
    error, 
    totalMinis, 
    totalQuantity, 
    getPageMinis,
    getAllMinis, 
    setMinis, 
    getTotalQuantity,
    currentPage,
    setCurrentPage,
    invalidateCache
  } = useMinis(itemsPerPage, miniSearch.searchTerm)

  const { showSuccess, showError } = useNotifications()

  // Preload images for adjacent pages
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
            setAllMinis(allMinisData);
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
        // Handle modal navigation
        if (e.key === 'ArrowLeft' && selectedMiniIndex > 0) {
          handlePrevious()
        } else if (e.key === 'ArrowRight' && selectedMiniIndex < allMinis.length - 1) {
          handleNext()
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
  }, [currentPage, totalMinis, isModalOpen, selectedMiniIndex, allMinis.length, handlePrevious, handleNext, itemsPerPage])

  const refreshImages = () => setImageTimestamp(Date.now())

  const getItemColumns = (mini: Mini) => {
    const typeNames = mini.types?.map(t => ({
      id: t.type_id,
      label: t.type.name,
      proxy_type: t.proxy_type
    })) || []
    const mainTypeId = mini.types?.find(t => !t.proxy_type)?.type_id
    const tagNames = mini.tags?.map(t => t.tag?.name).filter(Boolean) || []
    
    const categoryNames = mini.types?.flatMap(t => 
      t.type.categories?.map(category => category.name) || []
    ).filter((name, index, self) => 
      name && self.indexOf(name) === index
    ) || []

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
            src={`${getMiniImagePath(mini.id, 'thumb')}?t=${imageTimestamp}`}
            alt={mini.name}
            loading="lazy"
            className="w-full h-full object-cover"
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
      <div key="categories" className="min-w-[150px]">
        <ShowItems 
          items={categoryNames} 
          displayType="pills"
          scaleAnimation={true}
          shadowEnabled={true}
          itemStyle={{
            text: 'text-gray-200',
            bg: 'bg-purple-900',
            size: 'xs',
            border: '',
            hover: 'hover:bg-purple-800'
          }}
          maxVisible={3}
          emptyMessage="-"
        />
      </div>,
      <div key="types" className="min-w-[150px] relative overflow-visible">
        <ShowItems 
          items={typeNames} 
          displayType="pills"
          scaleAnimation={true}
          shadowEnabled={true}
          showTooltip={true}
          tooltipTitle="Types"
          itemStyle={{
            text: 'text-gray-200',
            bg: 'bg-orange-900',
            size: 'xs',
            border: '',
            hover: 'hover:bg-orange-800'
          }}
          selectedItem={mainTypeId}
          selectedStyle={{
            text: 'text-gray-200',
            bg: 'bg-orange-900',
            border: '',
            hover: 'hover:bg-orange-800',
            indicator: <div className="w-2 h-2 rounded-full bg-green-500" />
          }}
          maxVisible={3}
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
      <div key="quantity" className="text-center w-[25px]">{mini.quantity || 0}</div>,
      <div 
        key="switch"
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="flex justify-center w-[40px]"
      >
        <Switch
          checked={!!mini.in_use}
          onChange={async (checked) => {
            try {
              await updateMiniatureInUse(mini.id, checked);
              const updatedMinis = await getPageMinis(currentPage);
              if (updatedMinis) {
                setMinis(updatedMinis);
              }
            } catch (error) {
              console.error('Error updating in_use status:', error);
              showError('Failed to update status');
            }
          }}
        />
      </div>
    ]
  }

  const columnHeaders = [
    'Name',
    'Categories',
    'Types',
    'Tags',
    'Product Set',
    { title: 'QTY', className: 'text-center w-20' },
    { title: 'In Use', className: 'text-center w-20' }
  ]

  const handleAdd = () => {
    // Find default IDs for prepainted and medium base size
    const prepaintedId = paintedByOptions.find(p => 
      p.painted_by_name.toLowerCase() === 'prepainted'
    )?.id || 0;
    
    const mediumId = baseSizeOptions.find(b => 
      b.base_size_name.toLowerCase() === 'medium'
    )?.id || 0;

    const defaultPaintedBy = paintedByOptions.find(p => p.id === prepaintedId);
    const defaultBaseSize = baseSizeOptions.find(b => b.id === mediumId);

    // Initialize with empty miniature data for new entries
    const newMini: Mini = {
      id: 0,
      name: '',
      description: '',
      location: '',
      quantity: 1,
      painted_by_id: prepaintedId,
      base_size_id: mediumId,
      product_set_id: null,
      types: [],
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      in_use: null,
      painted_by: defaultPaintedBy || {
        id: prepaintedId,
        painted_by_name: 'Prepainted'
      },
      base_sizes: defaultBaseSize || {
        id: mediumId,
        base_size_name: 'Medium'
      },
      product_sets: undefined
    };

    setSelectedMini(newMini);
    setSelectedMiniIndex(-1); // Reset index for new entry
    setIsModalOpen(true);
  };

  const loadMiniature = async (mini: Mini, index: number) => {
    try {
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
      // If we have miniature data, update the selected mini with it
      if (miniatureData) {
        setSelectedMini(prev => prev ? { ...prev, ...miniatureData } : undefined);
      }

      setIsModalOpen(false);
      
      // Wait a bit to let the modal close animation finish
      await new Promise(resolve => setTimeout(resolve, 100));

      // Invalidate the cache to force a fresh fetch
      invalidateCache();

      // Refresh all data in a single batch
      const [updatedMinis, newTotalQuantity] = await Promise.all([
        getPageMinis(currentPage),
        getTotalQuantity()
      ]);

      // Update states
      setMinis(updatedMinis);
      refreshImages();
      
      // If we were editing a miniature, update the selected miniature with the new data
      if (selectedMini?.id) {
        const updatedMini = updatedMinis.find(mini => mini.id === selectedMini.id);
        if (updatedMini) {
          setSelectedMini(updatedMini);
        }
      }
    
    } catch (error) {
      console.error('Error saving miniature:', error);
      showError('Failed to save miniature');
    }
  };

  const handleSaveMiniature = async (data: Partial<Mini>) => {
    await handleSave(data);
  }

  const handleDelete = async (miniId: number) => {
    try {
      await deleteMiniature(miniId)
      
      // Refresh the minis list
      const updatedMinis = await getPageMinis(currentPage)
      if (updatedMinis) {
        // Force a re-render by updating the state
        setMinis(updatedMinis)
        // Update total quantity
        await getTotalQuantity()
        // Force refresh of images
        refreshImages()
      }
      
      showSuccess('Miniature deleted successfully')
    } catch (error) {
      console.error('Error deleting miniature:', error)
      showError('Failed to delete miniature')
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMini(undefined)
  }

  const handleDeleteMiniature = async (miniId: number) => {
    await handleDelete(miniId)
  }

  const handlePreviousMini = () => {
    handlePrevious()
  }

  const handleNextMini = () => {
    handleNext()
  }

  const hasPreviousMini = selectedMiniIndex > 0
  const hasNextMini = selectedMiniIndex < allMinis.length - 1
  const selectedMiniId = selectedMini?.id

  // Early return while loading view mode to prevent flash
  if (viewModeLoading || !viewMode) {
    return (
      <div className="flex items-center justify-center h-screen">
        <UI.LoadingSpinner message="Loading view preferences..." />
      </div>
    )
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  return (
    <>

    <PageHeader bgColor="none">
        <PageHeaderTextGroup>
          <PageHeaderText>Miniature Overview</PageHeaderText>
          <PageHeaderSubText>Manage your collection of miniatures</PageHeaderSubText>
        </PageHeaderTextGroup>
        <PageHeaderBigNumber
            icon={FaDiceD6}
            number={totalMinis}
            text="Total Types"
          />
          <PageHeaderBigNumber
            icon={FaShareAltSquare}
            number={totalQuantity}
            text="Total Miniatures"
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
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                    <button
                      className={`p-2 rounded focus:outline-none ${viewMode === 'table' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                      onClick={() => setViewMode('table')}
                      title="Table View"
                      tabIndex={-1}
                    >
                      <FaTable className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 rounded focus:outline-none ${viewMode === 'cards' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                      onClick={() => setViewMode('cards')}
                      title="Card View"
                      tabIndex={-1}
                    >
                      <FaThLarge className="w-4 h-4" />
                    </button>
                  </div>
                  <UI.Button 
                    variant="btnSuccess"
                    onClick={handleAdd}
                    disabled={loading}
                  >
                    + Add Miniature
                  </UI.Button>
                </div>
              </UI.CardHeaderRightSide>
            </UI.CardHeader>

            <UI.CardBody>
              <div className="mb-4">
                <UI.SearchInput
                  value={miniSearch.searchTerm}
                  onChange={(e) => {
                    miniSearch.handleSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search miniatures..."
                  className="w-full"
                />
              </div>

              <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
                {minis.length === 0 ? (
                  <UI.EmptyTableState icon={<FaDiceD6 />} message="No miniatures found" />
                ) : viewMode === 'table' ? (
                  <div className="overflow-x-auto overflow-y-auto">
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
                              hover:bgRowHover transition-colors cursor-pointer
                            `}
                            onClick={() => handleEdit(mini, index)}
                          >
                            {getItemColumns(mini).map((column, index) => (
                              <td
                                key={index}
                                className="px-6 py-2 text-sm text-gray-300"
                              >
                                {column}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : viewMode === 'cards' ? (
                  <div className="grid grid-cols-4 auto-rows-fr gap-2 h-[calc(92vh-22rem)] overflow-y-auto p-5">
                    {minis.map((mini, index) => {
                      const originalPath = `${getMiniImagePath(mini.id, 'original')}?t=${imageTimestamp}`
                      const company = mini.product_sets?.product_line?.company?.name
                      const productLine = mini.product_sets?.product_line?.name
                      const productSet = mini.product_sets?.name
                      const baseSize = mini.base_sizes?.base_size_name || 'Unknown size'
                      const paintedBy = mini.painted_by?.painted_by_name || 'Unknown'
                      const quantity = mini.quantity || 0

                      const rotation = (Math.sin(mini.id * 0.7) + Math.cos(mini.id * 1.3)) > 0 ? 
                        1 + Math.abs(Math.sin(mini.id)) : 
                        -2 + Math.abs(Math.sin(mini.id));

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
                              className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110 opacity-80 group-hover:opacity-90"
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
                          <div className="absolute inset-0 p-3 flex flex-col min-h-0">
                            {/* Top Row - Fixed height */}
                            <div className="flex-none flex justify-between items-start gap-2">
                              <div className="flex flex-col gap-1.5 max-w-[70%]">
                                <h3 className="font-bold text-gray-100 text-base leading-tight line-clamp-2">
                                  {mini.name} <span className="text-gray-400 text-xs">({rotation.toFixed(2)}°)</span>
                                </h3>
                                {mini.types?.find(t => !t.proxy_type) && (
                                  <div className="flex items-center">
                                    <ShowItems 
                                      items={[{
                                        id: mini.types.find(t => !t.proxy_type)?.type_id || 0,
                                        label: mini.types.find(t => !t.proxy_type)?.type.name || ''
                                      }]}
                                      displayType="pills"
                                      scaleAnimation={true}
                                      shadowEnabled={true}
                                      selectedItem={mini.types.find(t => !t.proxy_type)?.type_id}
                                      selectedStyle={{
                                        text: 'text-gray-200',
                                        bg: 'bg-orange-900',
                                        border: '',
                                        hover: 'hover:bg-orange-800',
                                        indicator: <div className="w-2 h-2 rounded-full bg-green-500" />
                                      }}
                                      itemStyle={{
                                        text: 'text-gray-200',
                                        bg: 'bg-orange-900',
                                        size: 'xs',
                                        border: 'border border-orange-800/50',
                                        hover: 'hover:bg-orange-800'
                                      }}
                                      maxVisible={1}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex-none bg-blue-900/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs text-gray-100 border border-blue-700/50">
                                QTY: {quantity}
                              </div>
                            </div>

                            {/* Middle Content - Scrollable if needed */}
                            <div className="flex-1 min-h-0 mt-2">
                              {mini.product_sets && (
                                <>
                                  {company && (
                                    <div className="flex flex-col items-start gap-1 mb-1.5">
                                      <img
                                        src={getCompanyLogoPath(company)}
                                        alt={company}
                                        className="h-5 w-auto object-contain opacity-90 mb-0.5"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      <p className="text-blue-400 text-sm">{company}</p>
                                    </div>
                                  )}
                                  {productLine && productSet && (
                                    productLine.toLowerCase() === productSet.toLowerCase() ? (
                                      <p className="text-gray-300 text-xs truncate">
                                        {productSet}
                                      </p>
                                    ) : (
                                      <>
                                        <p className="text-gray-300 text-xs truncate">
                                          {productLine}
                                        </p>
                                        <p className="text-gray-300 text-xs truncate">
                                          {productSet}
                                        </p>
                                      </>
                                    )
                                  )}
                                </>
                              )}
                            </div>

                            {/* Bottom Row - Fixed height */}
                            <div className="flex-none flex justify-between items-end mt-1.5">
                              <div className="space-y-0.5">
                                <p className="text-xs text-gray-400">
                                  <span className="text-gray-500">Base:</span> {baseSize.charAt(0).toUpperCase() + baseSize.slice(1).toLowerCase()}
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
                totalItems={totalMinis || 0}
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
        miniId={selectedMiniId}
        miniData={selectedMini}
        onSave={handleSaveMiniature}
        onDelete={handleDeleteMiniature}
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