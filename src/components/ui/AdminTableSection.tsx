import { IconType } from 'react-icons'
import * as UI from '.'

interface AdminTableSectionProps<T> {
  title: string
  icon: IconType
  iconColor?: string
  items: T[]
  selectedItem: T | null
  onSelect?: (item: T) => void
  onAdd?: () => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  loading?: boolean
  addButtonLabel?: string
  addButtonDisabled?: boolean
  emptyMessage?: string
  headerSubText?: string
  headerItalicText?: string
  searchProps?: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    rightElement?: React.ReactNode
  }
  pagination?: {
    currentPage: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
  }
  useTable?: boolean
  columnHeaders?: string[]
  getItemColumns?: (item: T) => string[]
  getItemName?: (item: T) => string
}

export default function AdminTableSection<T extends { id: number }>({
  title,
  icon: Icon,
  iconColor = 'text-blue-700',
  items,
  selectedItem,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  loading,
  addButtonLabel = '+ Add',
  addButtonDisabled = false,
  emptyMessage = 'No items found',
  headerSubText,
  headerItalicText,
  searchProps,
  pagination,
  useTable = false,
  columnHeaders = [],
  getItemColumns,
  getItemName
}: AdminTableSectionProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <UI.Card>
        <UI.CardHeader>
          <div className="flex">
            <UI.CardIcon size="big" className={iconColor}>
              <Icon />
            </UI.CardIcon>
            <div>
              <UI.CardHeaderText>
                {title}
              </UI.CardHeaderText>
              {headerSubText && (
                <UI.CardHeaderSubText>
                  {headerSubText}
                </UI.CardHeaderSubText>
              )}
              {headerItalicText && (
                <UI.CardHeaderItalicText>
                  {headerItalicText}
                </UI.CardHeaderItalicText>
              )}
            </div>
          </div>
          <UI.CardHeaderRightSide>
            {onAdd && (
              <UI.Button 
                variant="btnSuccess"
                onClick={onAdd}
                disabled={addButtonDisabled || loading}
              >
                {addButtonLabel}
              </UI.Button>
            )}
          </UI.CardHeaderRightSide>
        </UI.CardHeader>

        <UI.CardBody>
          {searchProps && (
            <div className="mb-4">
              <UI.SearchInput
                value={searchProps.value}
                onChange={(e) => searchProps.onChange(e.target.value)}
                placeholder={searchProps.placeholder}
                className="w-full"
                disabled={loading}
              />
            </div>
          )}

          <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
            {items.length === 0 ? (
              <UI.EmptyTableState icon={<Icon />} message={emptyMessage} />
            ) : useTable && columnHeaders.length > 0 && getItemColumns ? (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-[#333333]">
                  <thead>
                    <tr>
                      {columnHeaders.map((header, index) => (
                        <th
                          key={index}
                          className="px-6 py-3 bgTableHeader text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                      <th className="px-6 py-3 bgTableHeader" />
                    </tr>
                  </thead>
                  <tbody className="bgCardBody divide-y divide-[#333333]">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className={`bgRow hover:bgRowHover transition-colors ${
                          selectedItem?.id === item.id ? 'bgSelected' : ''
                        } cursor-pointer`}
                        onClick={onSelect ? () => onSelect(item) : undefined}
                      >
                        {getItemColumns(item).map((column, index) => (
                          <td
                            key={index}
                            className="px-6 py-4 text-sm text-gray-300"
                          >
                            {column}
                          </td>
                        ))}
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {onEdit && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEdit(item)
                                }}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                Edit
                              </button>
                            )}
                            {onDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(item)
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              items.map((item) => (
                <UI.TableRow
                  key={item.id}
                  title={getItemName?.(item) || ''}
                  isSelected={selectedItem?.id === item.id}
                  onSelect={onSelect ? () => onSelect(item) : undefined}
                  onEdit={onEdit ? () => onEdit(item) : undefined}
                  onDelete={onDelete ? () => onDelete(item) : undefined}
                />
              ))
            )}
          </div>
        </UI.CardBody>
      </UI.Card>

      {pagination && items.length > 0 && (
        <UI.Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={pagination.onPageChange}
          disabled={loading}
        />
      )}
    </div>
  )
} 