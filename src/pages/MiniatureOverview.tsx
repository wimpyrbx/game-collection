import { useState, useEffect } from 'react'
import { FaTable, FaExpand, FaDiceD6, FaThLarge, FaShareAltSquare, FaDiceD20, FaPlusSquare, FaMinusSquare, FaAngleDown, FaAngleUp, FaEye, FaEyeSlash } from 'react-icons/fa'
import { useMinis } from '../hooks/useMinis'
import { useAdminSearch } from '../hooks'
import * as UI from '../components/ui'
import { ShowItems } from '../components/ShowItems'
import type { Mini } from '../types/mini'
import { PageHeader, PageHeaderText, PageHeaderSubText, PageHeaderTextGroup, PageHeaderBigNumber } from '../components/ui'
import { getMiniImagePath } from '../utils/imageUtils'
import { MiniatureOverviewModal } from '../components/miniatureoverview/MiniatureOverviewModal'
import { useNotifications } from '../contexts/NotificationContext'
import { deleteMiniature, getMiniature, updateMiniatureInUse } from '../services/miniatureService'
import { Switch } from '../components/ui'

type ViewMode = 'table' | 'cards' | 'banner'

// Preload images for a given array of minis
const preloadImages = (minis: Mini[]) => {
  minis.forEach(mini => {
    const img = new Image()
    img.src = getMiniImagePath(mini.id, 'thumb')
  })
}

export default function MiniatureOverview() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const miniSearch = useAdminSearch({ searchFields: ['name'] })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMini, setSelectedMini] = useState<Mini | undefined>(undefined)
  const [selectedMiniIndex, setSelectedMiniIndex] = useState(-1)
  const itemsPerPage = 10

  const {
    minis, 
    loading, 
    error, 
    totalMinis, 
    totalQuantity, 
    getPageMinis, 
    setMinis, 
    getTotalQuantity,
    currentPage,
    setCurrentPage 
  } = useMinis(1, itemsPerPage, miniSearch.searchTerm)

  const { showSuccess, showError } = useNotifications()

  // Preload images for adjacent pages
  useEffect(() => {
    if (!loading && totalMinis) {
      const totalPages = Math.ceil(totalMinis / itemsPerPage)
      
      // Preload next page
      if (currentPage < totalPages) {
        getPageMinis(currentPage + 1).then(nextPageMinis => {
          if (nextPageMinis) preloadImages(nextPageMinis)
        })
      }
      
      // Preload previous page
      if (currentPage > 1) {
        getPageMinis(currentPage - 1).then(prevPageMinis => {
          if (prevPageMinis) preloadImages(prevPageMinis)
        })
      }
    }
  }, [currentPage, loading, totalMinis, getPageMinis])

  // Update keyboard navigation to use currentPage from hook
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
          setSelectedMiniIndex(prev => prev - 1)
        } else if (e.key === 'ArrowRight' && selectedMiniIndex < minis.length - 1) {
          setSelectedMiniIndex(prev => prev + 1)
        }
      } else {
        // Handle page navigation
        if (e.key === 'ArrowLeft' && currentPage > 1) {
          setCurrentPage(prev => prev - 1)
        } else if (e.key === 'ArrowRight' && currentPage < Math.ceil((totalMinis || 0) / itemsPerPage)) {
          setCurrentPage(prev => prev + 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalMinis, loading, isModalOpen, setCurrentPage])

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
            src={getMiniImagePath(mini.id, 'thumb')}
            alt={mini.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
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
    setSelectedMini(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = async (mini: Mini, index: number) => {
    await loadMiniature(mini, index)
  }

  const loadMiniature = async (mini: Mini, index: number) => {
    try {
      const completeData = await getMiniature(mini.id)
      if (completeData) {
        setSelectedMini(completeData)
        setSelectedMiniIndex(index)
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error('Error fetching complete mini data:', error)
      showError('Failed to load miniature data')
    }
  }

  const handlePrevious = async () => {
    // Get the global index in the full list
    const globalIndex = selectedMiniIndex - 1
    if (globalIndex >= 0) {
      // If we need to load the previous page
      if (globalIndex < (currentPage - 1) * itemsPerPage) {
        const prevPageMinis = await getPageMinis(currentPage - 1)
        if (prevPageMinis && prevPageMinis.length > 0) {
          const lastMiniOnPrevPage = prevPageMinis[prevPageMinis.length - 1]
          await loadMiniature(lastMiniOnPrevPage, globalIndex)
        }
      } else {
        // Same page navigation
        const prevMini = minis[globalIndex % itemsPerPage]
        await loadMiniature(prevMini, globalIndex)
      }
    }
  }

  const handleNext = async () => {
    const globalIndex = selectedMiniIndex + 1
    if (globalIndex < totalMinis) {
      // If we need to load the next page
      if (globalIndex >= currentPage * itemsPerPage) {
        const nextPageMinis = await getPageMinis(currentPage + 1)
        if (nextPageMinis && nextPageMinis.length > 0) {
          const firstMiniOnNextPage = nextPageMinis[0]
          await loadMiniature(firstMiniOnNextPage, globalIndex)
        }
      } else {
        // Same page navigation
        const nextMini = minis[globalIndex % itemsPerPage]
        await loadMiniature(nextMini, globalIndex)
      }
    }
  }

  const handleSave = async () => {
    try {
      setIsModalOpen(false);
      
      // Wait a bit to let the modal close animation finish
      await new Promise(resolve => setTimeout(resolve, 100));

      // Refresh the minis list for the current page with current search term
      const updatedMinis = await getPageMinis(currentPage);
      if (updatedMinis) {
        setMinis(updatedMinis);
        await getTotalQuantity();
        
        // If we were editing a miniature, update the selected miniature with the new data
        if (selectedMini?.id) {
          const updatedMini = updatedMinis.find(mini => mini.id === selectedMini.id);
          if (updatedMini) {
            setSelectedMini(updatedMini);
          }
        }
      }
      
      showSuccess(`Miniature ${selectedMini ? 'updated' : 'added'} successfully`);
    } catch (error) {
      console.error('Error saving miniature:', error);
      showError('Failed to save miniature');
    }
  };

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
      }
      
      showSuccess('Miniature deleted successfully')
    } catch (error) {
      console.error('Error deleting miniature:', error)
      showError('Failed to delete miniature')
    }
  }

  const renderCardView = () => {
    return (
      <div className="grid grid-cols-5 gap-4 h-[calc(90vh-20rem)]">
        {minis.map((mini, index) => {
          const thumbPath = getMiniImagePath(mini.id, 'thumb')
          const company = mini.product_sets?.product_line?.company?.name || 'No company'
          const productLine = mini.product_sets?.product_line?.name || 'No product line'
          const productSet = mini.product_sets?.name || 'No set'
          const baseSize = mini.base_sizes?.base_size_name || 'Unknown size'
          const paintedBy = mini.painted_by?.painted_by_name || 'Unknown'
          const quantity = mini.quantity || 0

          return (
            <div 
              key={mini.id} 
              className="group bgCardBody rounded-lg border border-gray-700 shadow-md overflow-hidden cursor-pointer transition-all duration-300 ease-in-out hover:border-gray-500 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] hover:rotate-1"
              onClick={() => handleEdit(mini, index)}
            >
              <div className="relative aspect-square bg-gray-800 overflow-hidden">
                <img
                  src={thumbPath}
                  alt={mini.name}
                  className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <FaDiceD20 className="absolute inset-0 m-auto w-12 h-12 text-gray-600 hidden" />
                <div className="absolute top-1 right-1 bg-gray-900/60 px-2 py-1 rounded text-xs text-gray-100">
                  QTY: {quantity}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-100 mb-2 truncate">{mini.name}</h3>
                <div className="space-y-1 text-sm text-gray-400">
                  <p className="truncate"><span className="text-gray-500">Company:</span> {company}</p>
                  <p className="truncate"><span className="text-gray-500">Line:</span> {productLine}</p>
                  <p className="truncate"><span className="text-gray-500">Set:</span> {productSet}</p>
                  <p className="truncate"><span className="text-gray-500">Base:</span> {baseSize}</p>
                  <p className="truncate"><span className="text-gray-500">Painted by:</span> {paintedBy}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderBannerView = () => {
    return (
      <div className="grid grid-cols-4 gap-6 h-[calc(90vh-20rem)]">
        {minis.map((mini, index) => {
          const thumbPath = getMiniImagePath(mini.id, 'thumb')
          const company = mini.product_sets?.product_line?.company?.name || 'No company'
          const productLine = mini.product_sets?.product_line?.name || 'No product line'
          const productSet = mini.product_sets?.name || 'No set'
          const baseSize = mini.base_sizes?.base_size_name || 'Unknown size'
          const paintedBy = mini.painted_by?.painted_by_name || 'Unknown'
          const quantity = mini.quantity || 0
          const typeNames = mini.types?.map(t => t.type.name) || []

          return (
            <div 
              key={mini.id} 
              className="group bgCardBody rounded-lg border border-gray-700 shadow-md overflow-hidden cursor-pointer transition-all duration-300 ease-in-out hover:border-gray-500 hover:shadow-xl hover:rotate-1 hover:-translate-y-1 flex"
              onClick={() => handleEdit(mini, index)}
            >
              <div className="relative w-1/3 bg-gray-800 overflow-hidden">
                <img
                  src={thumbPath}
                  alt={mini.name}
                  className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <FaDiceD20 className="absolute inset-0 m-auto w-12 h-12 text-gray-600 hidden" />
                <div className="absolute top-1 right-1 bg-gray-900/60 px-2 py-1 rounded text-xs text-gray-100">
                  QTY: {quantity}
                </div>
              </div>
              <div className="flex-1 p-6">
                <h3 className="font-bold text-xl text-gray-100 mb-4">{mini.name}</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-500">Types (eye - right):</span>{' '}
                    <ShowItems 
                      items={typeNames} 
                      displayType="text" 
                      textColor="text-gray-200"
                      toggle={{
                        type: 'icon',
                        more: <FaEye className="w-3 h-3 inline opacity-75 hover:opacity-100 transition-opacity duration-200" />,
                        less: <FaEyeSlash className="w-3 h-3 inline opacity-75 hover:opacity-100 transition-opacity duration-200" />
                      }}
                      togglePlacement="right"
                    />
                  </p>
                  <p>
                    <span className="text-gray-500">Types (plus/minus - start):</span>{' '}
                    <ShowItems 
                      items={typeNames} 
                      displayType="text" 
                      textColor="text-gray-200"
                      toggle={{
                        type: 'icon',
                        more: <FaPlusSquare className="w-3 h-3 inline opacity-75 hover:opacity-100 transition-opacity duration-200" />,
                        less: <FaMinusSquare className="w-3 h-3 inline opacity-75 hover:opacity-100 transition-opacity duration-200" />
                      }}
                      togglePlacement="start"
                    />
                  </p>
                  <p>
                    <span className="text-gray-500">Types (angle - top):</span>{' '}
                    <ShowItems 
                      items={typeNames} 
                      displayType="text" 
                      textColor="text-gray-200"
                      toggle={{
                        type: 'icon',
                        more: <FaAngleDown className="w-4 h-4 inline opacity-75 hover:opacity-100 transition-transform duration-200" />,
                        less: <FaAngleUp className="w-4 h-4 inline opacity-75 hover:opacity-100 transition-transform duration-200" />
                      }}
                      togglePlacement="top"
                    />
                  </p>
                  <p><span className="text-gray-500">Company:</span> <span className="text-gray-300">{company}</span></p>
                  <p><span className="text-gray-500">Line:</span> <span className="text-gray-300">{productLine}</span></p>
                  <p><span className="text-gray-500">Set:</span> <span className="text-gray-300">{productSet}</span></p>
                  <p><span className="text-gray-500">Base:</span> <span className="text-gray-300">{baseSize}</span></p>
                  <p><span className="text-gray-500">Painted by:</span> <span className="text-gray-300">{paintedBy}</span></p>
                </div>
              </div>
            </div>
          )
        })}
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
                    <button
                      className={`p-2 rounded focus:outline-none ${viewMode === 'banner' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                      onClick={() => setViewMode('banner')}
                      title="Banner View"
                      tabIndex={-1}
                    >
                      <FaExpand className="w-4 h-4" />
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
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-[#333333]">
                      <thead>
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
                  renderCardView()
                ) : (
                  renderBannerView()
                )}
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
        onClose={() => setIsModalOpen(false)}
        miniId={selectedMini?.id}
        miniData={selectedMini}
        onSave={handleSave}
        onDelete={handleDelete}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={selectedMiniIndex > 0}
        hasNext={selectedMiniIndex < totalMinis - 1}
        isLoading={loading}
      />
    </>
  )
} 