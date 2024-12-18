import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaQuestionCircle } from 'react-icons/fa';

export type TogglePlacement = 'start' | 'end' | 'right' | 'top';

interface ShowItemsProps {
  items: (string | { id?: string | number; label?: string; name?: string })[];
  displayType: 'pills' | 'text';
  maxVisible?: number;
  maxPerRow?: number;
  scaleAnimation?: boolean;
  shadowEnabled?: boolean;
  showTooltip?: boolean;
  tooltipTitle?: string;
  textColor?: string;
  itemStyle?: {
    text?: string;
    bg?: string;
    size?: 'xs' | 'sm' | 'base';
    border?: string;
    hover?: string;
    cursor?: string;
  };
  emptyMessage?: string;
  showRemoveButton?: boolean;
  onItemRemove?: (index: number) => void;
  toggle?: boolean | {
    type: string;
    more: React.ReactNode;
    less: React.ReactNode;
  };
  toggleStyle?: {
    text?: string;
    bg?: string;
    border?: string;
    hover?: string;
  };
  togglePlacement?: 'start' | 'end' | 'right' | 'top';
  selectedItem?: string | number;
  selectedStyle?: {
    text?: string;
    bg?: string;
    border?: string;
    hover?: string;
    indicator?: React.ReactNode;
  };
}

export function ShowItems({
  items,
  displayType = 'pills',
  maxVisible = 3,
  maxPerRow,
  scaleAnimation = false,
  shadowEnabled = false,
  showTooltip = false,
  tooltipTitle = 'Items',
  textColor,
  itemStyle = {
    text: 'text-gray-200',
    bg: 'bg-gray-700',
    size: 'xs',
    border: '',
    hover: 'hover:bg-gray-600',
    cursor: 'cursor-pointer'
  },
  emptyMessage = 'No items',
  showRemoveButton,
  onItemRemove,
  toggle,
  toggleStyle = {
    text: 'text-gray-400',
    bg: 'bg-gray-700',
    border: 'border border-gray-600',
    hover: 'hover:bg-gray-600'
  },
  togglePlacement = 'end',
  selectedItem,
  selectedStyle
}: ShowItemsProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  const renderItem = (item: any, index: number, isLastVisibleItem: boolean) => {
    const itemText = typeof item === 'string' ? item : item.label || item.name || ''
    const itemId = typeof item === 'string' ? item : item.id
    const isSelected = selectedItem !== undefined && itemId === selectedItem
    
    const itemContent = (
      <motion.div
        key={typeof item === 'string' ? `${item}-${index}` : item.id || index}
        initial={scaleAnimation ? { scale: 0.8, opacity: 0 } : undefined}
        animate={scaleAnimation ? { scale: 1, opacity: 1 } : undefined}
        transition={{ 
          delay: scaleAnimation ? index * 0.05 : 0,
          duration: 0.15
        }}
        className={`
          inline-flex items-center gap-1
          ${displayType === 'pills' ? 'rounded-full px-2 py-0.5 pb-1 pr-2.5' : ''}
          ${isSelected ? selectedStyle?.bg || 'bg-green-600/20' : itemStyle?.bg || 'bg-blue-500/20'}
          ${isSelected ? selectedStyle?.border || 'border-green-600' : itemStyle?.border || ''}
          ${showRemoveButton ? 'cursor-pointer hover:bg-red-900/30' : itemStyle?.cursor || 'cursor-pointer'}
          ${!showRemoveButton && (isSelected ? selectedStyle?.hover || 'hover:bg-green-600/30' : itemStyle?.hover || 'hover:bg-blue-500/30')}
          ${shadowEnabled ? 'shadow-sm shadow-gray-800' : ''}
          transition-colors
          relative
          ${maxPerRow ? 'w-auto' : ''}
        `}
        onClick={() => showRemoveButton && onItemRemove && onItemRemove(index)}
      >
        {isSelected && selectedStyle?.indicator && (
          <span className="mr-1 mt-0.5">{selectedStyle.indicator}</span>
        )}
        <span className={`
          ${isSelected ? selectedStyle?.text : textColor || itemStyle?.text || 'text-blue-200'} 
          ${itemStyle?.size === 'xs' ? 'text-xs' : 
            itemStyle?.size === 'sm' ? 'text-sm' : 
            'text-base'
          }
          ${showRemoveButton ? 'group-hover:line-through' : ''}
        `}>
          {itemText}
        </span>
        {showRemoveButton && onItemRemove && (
          <div className="text-red-500 group-hover:text-red-400 transition-colors flex items-center justify-center text-xs font-bold ml-1 -mt-0.5">
            ×
          </div>
        )}
      </motion.div>
    )

    return itemContent;
  }

  if (items.length === 0) {
    return <div className="text-sm text-gray-500">{emptyMessage}</div>
  }

  const toggleButton = toggle && items.length > maxVisible && (
    <button
      type="button"
      onClick={() => setShowAll(!showAll)}
      className={`
        inline-flex items-center gap-1 rounded-full px-2 py-0.5
        ${toggleStyle?.bg || 'bg-gray-700'}
        ${toggleStyle?.border || 'border border-gray-600'}
        ${toggleStyle?.hover || 'hover:bg-gray-600'}
        transition-colors
      `}
    >
      <span className={toggleStyle?.text || 'text-gray-400'}>
        {typeof toggle === 'object' 
          ? (showAll ? toggle.less : toggle.more)
          : (showAll ? 'Show Less' : `+${items.length - maxVisible} More`)}
      </span>
    </button>
  );

  const visibleItems = items.slice(0, showAll ? items.length : maxVisible);

  // Render tooltip icon and content
  const tooltipContent = showTooltip && !showAll && items.length > maxVisible && (
    <div className="relative inline-block ml-1">
      <div
        className="text-gray-400 hover:text-gray-300 cursor-help"
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        <FaQuestionCircle className="w-4 h-7" />
      </div>
      {isTooltipVisible && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute z-[99999] left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-800 rounded shadow-xl shadow-black/50 border border-gray-700 w-[200px]"
        >
          <div className="text-xs">
            <div className="font-medium px-3 py-2.5 border-b border-gray-700 bg-gray-900/80 text-gray-300">
              {tooltipTitle} ({items.length})
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {items.map((item, index) => {
                const itemText = typeof item === 'string' ? item : item.label || item.name || ''
                return (
                  <div 
                    key={index} 
                    className={`
                      inline-flex items-center rounded-full px-2 py-0.5
                      ${itemStyle?.bg || 'bg-gray-700'}
                      ${itemStyle?.border || ''}
                      ${itemStyle?.hover || 'hover:bg-gray-600'}
                      transition-colors
                      text-xs
                      ${itemStyle?.text || 'text-gray-200'}
                    `}
                  >
                    {itemText}
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );

  return (
    <div className={`flex flex-wrap gap-1.5 ${maxPerRow ? 'justify-start' : ''}`}>
      {togglePlacement === 'start' && toggleButton}
      <div className={`flex flex-wrap gap-1.5 ${togglePlacement === 'top' ? 'w-full' : ''}`}>
        <AnimatePresence mode="sync">
          {visibleItems.map((item, index) => renderItem(item, index, index === visibleItems.length - 1))}
        </AnimatePresence>
        {tooltipContent}
      </div>
      {(togglePlacement === 'end' || togglePlacement === 'right') && toggleButton}
    </div>
  )
} 