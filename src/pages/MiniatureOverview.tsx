import React, { useState } from 'react'
import { FaDragon, FaArchive, FaEgg, FaEllo, FaExpand, FaDog, FaHotdog, FaAlgolia, FaBullseye, FaCarCrash, FaChessKing, FaChessBishop, FaChessPawn } from 'react-icons/fa'
import { PageHeader, PageHeaderIcon, PageHeaderText, PageHeaderSubText, PageHeaderBigNumber } from '../components/ui'
import { AdminTableSection } from '../components/ui/AdminTableSection'
import { useMinis } from '../hooks/useMinis'
import type { Mini } from '../types/mini'

const MiniatureOverview = () => {
  const { minis, loading, error } = useMinis()
  const [selectedMini, setSelectedMini] = useState<Mini | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  
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

    return [
      mini.name,
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
      <PageHeader bgColor="bg-cyan-900">
        <PageHeaderIcon
          icon={FaDragon}
          className="text-white"
          bgClassName="bg-cyan-700"
        />
          <PageHeaderText>Miniature Overview</PageHeaderText>
          <PageHeaderSubText>Manage your miniature collection</PageHeaderSubText>
        <PageHeaderBigNumber
          icon={FaChessBishop}
          number="12"
          text="Miniatures"
        />
        <PageHeaderBigNumber
          icon={FaChessPawn}
          number="25"
          text="Miniatures in Total"
        />
      </PageHeader>
      
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12">
          <AdminTableSection
            title="Miniatures"
            icon={FaDragon}
            iconColor="text-purple-600"
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
            searchProps={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: "Search miniatures..."
            }}
            pagination={{
              currentPage,
              totalItems: minis.length,
              itemsPerPage: 10,
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

export default MiniatureOverview 