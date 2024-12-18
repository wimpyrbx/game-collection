import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaQuestionCircle, FaTimesCircle } from 'react-icons/fa';

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
    hover: 'hover:bg-gray-600'
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
  togglePlacement = 'end'
}: ShowItemsProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  const renderItem = (item: any, index: number) => {
    const itemText = typeof item === 'string' ? item : item.label || item.name || ''
    
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
          ${displayType === 'pills' ? 'rounded-full px-2 py-0.5' : ''}
          ${itemStyle?.bg || 'bg-blue-500/20'}
          ${itemStyle?.border || ''}
          ${itemStyle?.hover || 'hover:bg-blue-500/30'}
          ${shadowEnabled ? 'shadow-sm' : ''}
          transition-colors
          relative
          ${maxPerRow ? 'w-auto' : ''}
        `}
        onMouseEnter={() => showTooltip && setIsTooltipVisible(true)}
        onMouseLeave={() => showTooltip && setIsTooltipVisible(false)}
      >
        <span className={`
          ${textColor || itemStyle?.text || 'text-blue-200'} 
          ${itemStyle?.size === 'xs' ? 'text-xs' : 
            itemStyle?.size === 'sm' ? 'text-sm' : 
            'text-base'
          }
        `}>
          {showTooltip && <FaQuestionCircle className="inline mr-1 text-gray-400" />}
          {itemText}
        </span>
        {showRemoveButton && onItemRemove && (
          <button
            type="button"
            onClick={() => onItemRemove(index)}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <FaTimesCircle className="w-3 h-3" />
          </button>
        )}
        {showTooltip && isTooltipVisible && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-xs text-gray-200 rounded shadow-lg whitespace-nowrap">
            {tooltipTitle}
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

  return (
    <div className={`flex flex-wrap gap-1.5 ${maxPerRow ? 'justify-start' : ''}`}>
      {togglePlacement === 'start' && toggleButton}
      <div className={`flex flex-wrap gap-1.5 ${togglePlacement === 'top' ? 'w-full' : ''}`}>
        <AnimatePresence mode="sync">
          {items.slice(0, showAll ? items.length : maxVisible).map((item, index) => renderItem(item, index))}
        </AnimatePresence>
      </div>
      {(togglePlacement === 'end' || togglePlacement === 'right') && toggleButton}
    </div>
  )
} 