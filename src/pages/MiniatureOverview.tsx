import React, { useState, useEffect } from 'react'
import { FaDragon, FaArchive, FaEgg, FaEllo, FaExpand, FaDog, FaHotdog, FaAlgolia, FaBullseye, FaCarCrash, FaChessKing, FaChessBishop, FaChessPawn, FaDiceD20, FaTable, FaTabletAlt, FaListUl, FaThList, FaRegListAlt, FaToolbox, FaStroopwafel, FaExclamationTriangle, FaDiceD6, FaThLarge, FaShareAltSquare } from 'react-icons/fa'
import { useMinis } from '../hooks/useMinis'
import { useAdminPagination, useAdminSearch } from '../hooks'
import * as UI from '../components/ui'
import type { Mini } from '../types/mini'
import { PageHeader, PageHeaderIcon, PageHeaderText, PageHeaderSubText, PageHeaderTextGroup, PageHeaderBigNumber } from '../components/ui'
import { getMiniImagePath } from '../utils/imageUtils'
import { MiniatureOverviewModal } from '../components/miniatureoverview/MiniatureOverviewModal'

type ViewMode = 'table' | 'cards'

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
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMini, setSelectedMini] = useState<Mini | undefined>(undefined)

  const { minis, loading, error, totalMinis, getPageMinis } = useMinis(
    currentPage,
    itemsPerPage,
    miniSearch.searchTerm
  )

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

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return

      if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(prev => prev - 1)
      } else if (e.key === 'ArrowRight' && currentPage < Math.ceil((totalMinis || 0) / itemsPerPage)) {
        setCurrentPage(prev => prev + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalMinis, loading])

  const getItemColumns = (mini: Mini) => {
    const types = mini.types?.map(t => {
      const categories = t.type.categories?.map(c => c.category.name).join(', ') || 'No categories'
      return `${t.type.name} (${categories})`
    }).join(' | ') || 'No type'
    
    const company = mini.product_sets?.product_lines?.company?.name || 'No company'
    const productLine = mini.product_sets?.product_lines?.name || 'No product line'
    const productSet = mini.product_sets?.name || 'No set'
    const location = mini.location || 'No location'
    const paintedBy = mini.painted_by?.painted_by_name || 'Unknown'
    const baseSize = mini.base_sizes?.base_size_name || 'Unknown size'
    const quantity = mini.quantity || 0

    const thumbPath = getMiniImagePath(mini.id, 'thumb')

    return [
      <div key="image" className="flex items-center gap-4">
        <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-800 flex items-center justify-center">
          <img
            src={thumbPath}
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
      types,
      company,
      productLine,
      productSet,
      location,
      paintedBy,
      baseSize,
      quantity.toString()
    ]
  }

  const columnHeaders = [
    'Name',
    'Types',
    'Company',
    'Product Line',
    'Product Set',
    'Location',
    'Painted By',
    'Base Size',
    'Quantity'
  ]

  const handleAdd = () => {
    setSelectedMini(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (mini: Mini) => {
    setSelectedMini(mini)
    setIsModalOpen(true)
  }

  const handleSave = async (data: Partial<Mini>) => {
    try {
      // TODO: Implement save functionality
      setIsModalOpen(false)
      setSelectedMini(undefined)
    } catch (error) {
      console.error('Error saving miniature:', error)
    }
  }

  const renderCardView = () => {
    return (
      <div className="grid grid-cols-5 gap-4">
        {minis.map((mini) => {
          const thumbPath = getMiniImagePath(mini.id, 'thumb')
          const productSet = mini.product_sets?.name || 'No set'
          const baseSize = mini.base_sizes?.base_size_name || 'Unknown size'
          const paintedBy = mini.painted_by?.painted_by_name || 'Unknown'
          const quantity = mini.quantity || 0

          return (
            <div 
              key={mini.id} 
              className="bgCardBody rounded-lg border border-gray-700 shadow-md overflow-hidden cursor-pointer transition-all hover:border-gray-600"
              onClick={() => handleEdit(mini)}
            >
              <div className="relative aspect-square bg-gray-800">
                <img
                  src={thumbPath}
                  alt={mini.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
                <FaDiceD20 className="absolute inset-0 m-auto w-12 h-12 text-gray-600 hidden" />
                <div className="absolute top-2 right-2 bg-gray-900/80 px-2 py-1 rounded text-sm font-medium text-gray-100">
                  QTY: {quantity}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-100 mb-2 truncate">{mini.name}</h3>
                <div className="space-y-1 text-sm text-gray-400">
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

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  return (
    <>

    <PageHeader bgColor="none">
        <PageHeaderTextGroup>
          <PageHeaderText>Miniatures</PageHeaderText>
          <PageHeaderSubText>Manage your collection of miniatures</PageHeaderSubText>
        </PageHeaderTextGroup>
        <PageHeaderBigNumber
            icon={FaDiceD6}
            number={totalMinis}
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
                  onChange={(e) => miniSearch.handleSearch(e.target.value)}
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
                              className="px-6 py-2 bgTableHeader text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bgCardBody divide-y divide-[#333333]">
                        {minis.map((mini) => (
                          <tr
                            key={mini.id}
                            className="bgRow hover:bgRowHover transition-colors cursor-pointer"
                            onClick={() => handleEdit(mini)}
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
                ) : (
                  renderCardView()
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
                onPageChange={setCurrentPage}
                disabled={loading}
              />
            </div>
          )}
        </div>
      </div>

      <MiniatureOverviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedMini(undefined)
        }}
        mini={selectedMini}
        onSave={handleSave}
      />
    </>
  )
} 