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
  }
  pagination?: {
    currentPage: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
  }
  getItemName: (item: T) => string
}

export function AdminTableSection<T extends { id: number }>({
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
                disabled={addButtonDisabled}
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
              />
            </div>
          )}

          <UI.TableHeader title={title} />

          {loading ? (
            <UI.LoadingSpinner message={`Loading ${title.toLowerCase()}...`} />
          ) : items.length === 0 ? (
            <UI.EmptyTableState icon={<Icon />} message={emptyMessage} />
          ) : (
            items.map((item) => (
              <UI.TableRow
                key={item.id}
                title={getItemName(item)}
                isSelected={selectedItem?.id === item.id}
                onSelect={onSelect ? () => onSelect(item) : undefined}
                onEdit={onEdit ? () => onEdit(item) : undefined}
                onDelete={onDelete ? () => onDelete(item) : undefined}
              />
            ))
          )}
        </UI.CardBody>
      </UI.Card>

      {pagination && items.length > 0 && (
        <UI.Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  )
} 