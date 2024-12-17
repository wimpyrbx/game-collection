import React, { useState } from 'react';

export type TogglePlacement = 'start' | 'end' | 'right' | 'top';

interface ShowItemsProps {
  items: string[];
  displayType: 'text' | 'pills';
  maxVisible?: number;
  toggle?: {
    type: 'text' | 'icon';
    more: React.ReactNode;
    less: React.ReactNode;
  };
  togglePlacement?: TogglePlacement;
  itemStyle?: {
    text?: string;
    bg?: string;
    size?: 'xs' | 'sm' | 'md';
    border?: string;
    hover?: string;
  };
  textColor?: string;
  emptyMessage?: string;
  maxPerRow?: number;
}

export function ShowItems({
  items,
  displayType,
  maxVisible = 3,
  toggle,
  togglePlacement = 'end',
  itemStyle = {
    text: 'text-gray-200',
    bg: 'bg-gray-700',
    size: 'xs',
    border: 'border border-gray-600',
    hover: 'hover:bg-gray-600'
  },
  textColor,
  emptyMessage = 'No items',
  maxPerRow = 3
}: ShowItemsProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? items : items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;

  const getTextSize = () => {
    switch (itemStyle.size) {
      case 'xs': return 'text-xs';
      case 'sm': return 'text-sm';
      case 'md': return 'text-base';
      default: return 'text-sm';
    }
  };

  const getPillPadding = () => {
    switch (itemStyle.size) {
      case 'xs': return 'px-3 py-1';
      case 'sm': return 'px-4 py-1.5';
      case 'md': return 'px-5 py-2';
      default: return 'px-4 py-1.5';
    }
  };

  const renderToggleButton = () => {
    if (!toggle || !hasMore) return null;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowAll(!showAll);
    };

    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-300 transition-colors"
      >
        {showAll ? toggle.less : toggle.more}
      </button>
    );
  };

  const renderItems = () => {
    if (items.length === 0) {
      return <span className="text-gray-500 italic">{emptyMessage}</span>;
    }

    if (displayType === 'pills') {
      return (
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${maxPerRow}, minmax(0, 1fr))` }}>
          {visibleItems.map((item, index) => (
            <span
              key={index}
              className={`
                inline-flex items-center justify-center rounded-full shadow-sm shadow-gray-900
                ${getPillPadding()}
                ${getTextSize()}
                ${itemStyle.text}
                ${itemStyle.bg}
                ${itemStyle.border}
                ${itemStyle.hover}
                transition-colors duration-200
              `}
            >
              {item}
            </span>
          ))}
        </div>
      );
    }

    return (
      <span className={`${getTextSize()} ${textColor || itemStyle.text}`}>
        {visibleItems.join(', ')}
      </span>
    );
  };

  const toggleButton = renderToggleButton();

  return (
    <div className="flex items-center gap-2">
      {togglePlacement === 'start' && toggleButton}
      {togglePlacement === 'top' && (
        <div className="flex flex-col items-start gap-1">
          {toggleButton}
          {renderItems()}
        </div>
      )}
      {togglePlacement !== 'top' && renderItems()}
      {['end', 'right'].includes(togglePlacement) && toggleButton}
    </div>
  );
} 