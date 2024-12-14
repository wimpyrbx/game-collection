import React, { useState } from 'react'
import { FaDragon, FaArchive, FaEgg, FaEllo, FaExpand, FaDog, FaHotdog, FaAlgolia, FaBullseye, FaCarCrash, FaChessKing, FaChessBishop, FaChessPawn, FaDiceD20, FaTable, FaTabletAlt, FaListUl, FaThList, FaRegListAlt, FaToolbox, FaStroopwafel, FaDiceD6 } from 'react-icons/fa'
import { useMinis } from '../hooks/useMinis'
import { useAdminPagination, useAdminSearch } from '../hooks'
import * as UI from '../components/ui'
import type { Mini } from '../types/mini'
import { PageHeader, PageHeaderIcon, PageHeaderText, PageHeaderSubText, PageHeaderTextGroup, PageHeaderBigNumber } from '../components/ui'

const getMiniImagePath = (id: number, type: 'thumb' | 'original' = 'original') => {
  const idStr = id.toString()
  const x = idStr[0]
  const y = idStr.length > 1 ? idStr[1] : '0'
  return `/public/images/miniatures/${type}/${x}/${y}/${id}.webp`
}

export default function MiniatureOverview() {
  const [selectedMini, setSelectedMini] = useState<Mini | null>(null)
  const miniSearch = useAdminSearch({ searchFields: ['name'] })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { minis, loading, error, totalMinis } = useMinis(
    currentPage,
    itemsPerPage,
    miniSearch.searchTerm
  )

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

    const imagePath = getMiniImagePath(mini.id)
    const thumbPath = getMiniImagePath(mini.id, 'thumb')

    return [
      <div key="image" className="flex items-center gap-4">
        <div className="relative w-12 h-12 rounded overflow-hidden bg-gray-800 flex items-center justify-center">
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
    // TODO: Implement add functionality
    console.log('Add clicked')
  }

  const handleEdit = (mini: Mini) => {
    // TODO: Implement edit functionality
    console.log('Edit clicked', mini)
  }

  const handleDelete = (mini: Mini) => {
    // TODO: Implement delete functionality
    console.log('Delete clicked', mini)
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>
  }

  return (
    <>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <UI.AdminTableSection
            title="Miniatures"
            icon={FaDiceD6}
            iconColor="text-white"
            items={minis}
            selectedItem={selectedMini}
            onSelect={setSelectedMini}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
            addButtonLabel="+ Add Miniature"
            emptyMessage="No miniatures found"
            headerSubText="Manage your miniature collection"
            headerItalicText='Add, edit, and delete miniatures from your collection'
            searchProps={{
              value: miniSearch.searchTerm,
              onChange: miniSearch.handleSearch,
              placeholder: "Search miniatures..."
            }}
            pagination={{
              currentPage,
              totalItems: totalMinis || 0,
              itemsPerPage,
              onPageChange: setCurrentPage
            }}
            columnHeaders={columnHeaders}
            getItemColumns={getItemColumns}
            useTable={true}
          />
        </div>
      </div>
    </>
  )
} 