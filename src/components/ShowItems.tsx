import React, { useState } from 'react';

type DisplayType = 'text' | 'pills' | 'list';
type TogglePlacement = 'end' | 'start' | 'right';
type ItemSize = 'xs' | 'sm' | 'md' | 'lg';

interface ItemStyle {
  text?: string;
  bg?: string;
  size?: ItemSize;
  border?: string;
  hover?: string;
}

interface ToggleConfig {
  type: 'text' | 'icon';
  more: React.ReactNode;
  less: React.ReactNode;
  className?: string;
}

interface ShowItemsProps {
  items: string[];
  displayType?: DisplayType;
  itemStyle?: ItemStyle;
  className?: string;
  maxVisible?: number;
  toggle?: ToggleConfig;
  togglePlacement?: TogglePlacement;
  delimiter?: string;
  emptyMessage?: string;
}

const defaultItemStyle: ItemStyle = {
  text: 'text-gray-200',
  bg: 'bg-gray-700',
  size: 'sm',
  border: 'border border-gray-600',
  hover: 'hover:bg-gray-600'
};

const sizeClasses: Record<ItemSize, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-sm',
  md: 'px-3 py-1 text-base',
  lg: 'px-4 py-1.5 text-lg'
};

interface ToggleButtonProps {
  expanded: boolean;
  onClick: (e: React.MouseEvent) => void;
  config: ToggleConfig;
  hiddenCount?: number;
  textColor?: string;
  placement?: TogglePlacement;
  children: React.ReactNode;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  expanded,
  onClick,
  config,
  hiddenCount = 0,
  textColor = 'text-gray-200',
  placement = 'end',
  children
}) => {
  const content = expanded ? config.less : config.more;
  
  const wrapperClasses = {
    start: 'inline-flex flex-row items-center',
    end: 'inline-flex flex-row items-center',
    right: 'inline-flex flex-row items-center justify-between w-full'
  };

  const buttonClasses = {
    start: 'mr-2',
    end: 'ml-2',
    right: 'ml-2'
  };

  const button = (
    <button
      onClick={onClick}
      className={`${buttonClasses[placement]} ${textColor} ${config.className || ''} ${
        config.type === 'icon' 
          ? 'hover:opacity-80' 
          : 'text-xs hover:underline'
      }`}
    >
      {config.type === 'icon' 
        ? content 
        : expanded ? content : `+${hiddenCount} ${content}`
      }
    </button>
  );

  return (
    <span className={wrapperClasses[placement]}>
      {placement === 'start' && button}
      {children}
      {['end', 'right'].includes(placement) && button}
    </span>
  );
};

export const ShowItems: React.FC<ShowItemsProps> = ({ 
  items, 
  displayType = 'text',
  itemStyle = defaultItemStyle,
  className = '',
  maxVisible = 3,
  toggle = {
    type: 'text',
    more: 'more',
    less: 'less'
  },
  togglePlacement = 'end',
  delimiter = ', ',
  emptyMessage = 'No items'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const style = { ...defaultItemStyle, ...itemStyle };
  
  if (items.length === 0) {
    return <span className={`${style.text} ${className}`}>{emptyMessage}</span>;
  }

  const visibleItems = isExpanded ? items : items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const renderContent = () => {
    switch (displayType) {
      case 'pills':
        return (
          <span className="inline-flex flex-wrap gap-1 items-center">
            {visibleItems.map((item, index) => (
              <span
                key={index}
                className={`rounded-full ${sizeClasses[style.size || 'sm']} ${style.text} ${style.bg} ${style.border} ${style.hover} transition-all duration-200 transform`}
              >
                {item}
              </span>
            ))}
          </span>
        );

      case 'list':
        return (
          <ul className={`list-disc list-inside ${style.text}`}>
            {visibleItems.map((item, index) => (
              <li key={index} className={`${style.hover} transition-all duration-200 transform inline-block`}>
                {item}
              </li>
            ))}
          </ul>
        );

      case 'text':
      default:
        return (
          <span className={`${style.text} ${style.hover} transition-all duration-200 transform inline-block`}>
            {visibleItems.join(delimiter)}
          </span>
        );
    }
  };

  const ToggleWrapper = ({ children }: { children: React.ReactNode }) => {
    const wrapperClasses = {
      start: 'inline-flex flex-row items-center',
      end: 'inline-flex flex-row items-center',
      right: 'inline-flex flex-row items-center justify-between w-full'
    };

    return (
      <span className={wrapperClasses[togglePlacement]}>
        {placement === 'start' && button}
        {children}
        {['end', 'right'].includes(placement) && button}
      </span>
    );
  };

  if (!hasMore) {
    return <span className={className}>{renderContent()}</span>;
  }

  return (
    <span className={className}>
      <ToggleButton
        expanded={isExpanded}
        onClick={handleToggle}
        config={toggle}
        hiddenCount={items.length - maxVisible}
        textColor={style.text}
        placement={togglePlacement}
      >
        {renderContent()}
      </ToggleButton>
    </span>
  );
}; 