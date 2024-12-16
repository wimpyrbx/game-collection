import React, { useState } from 'react';

type DisplayType = 'text' | 'pills' | 'list';
type PillSize = 'xs' | 'sm' | 'md' | 'lg';

interface ToggleConfig {
  type: 'text' | 'icon';
  more: React.ReactNode;
  less: React.ReactNode;
  className?: string;
}

interface MinisInfoTypeProps {
  types: string[];
  displayType?: DisplayType;
  textColor?: string;
  bgColor?: string;
  className?: string;
  pillSize?: PillSize;
  maxVisible?: number;
  toggle?: ToggleConfig;
}

const pillSizeClasses: Record<PillSize, string> = {
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
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  expanded,
  onClick,
  config,
  hiddenCount = 0,
  textColor = 'text-gray-200'
}) => {
  const baseClasses = 'cursor-pointer ml-1 ';
  const content = expanded ? config.less : config.more;
  
  if (config.type === 'icon') {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} hover:opacity-80 ${textColor} ${config.className || ''}`}
      >
        {content}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} hover:underline text-xs ${textColor} ${config.className || ''}`}
    >
      {expanded ? content : `+${hiddenCount} ${content}`}
    </button>
  );
};

export const MinisInfoType: React.FC<MinisInfoTypeProps> = ({ 
  types, 
  displayType = 'text',
  textColor = 'text-gray-200',
  bgColor = 'bg-gray-700',
  className = '',
  pillSize = 'sm',
  maxVisible = 3,
  toggle = {
    type: 'text',
    more: 'more',
    less: 'less'
  }
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (types.length === 0) {
    return <span className={`${textColor} ${className}`}>No types</span>;
  }

  const visibleTypes = isExpanded ? types : types.slice(0, maxVisible);
  const hasMore = types.length > maxVisible;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const toggleButton = hasMore && (
    <ToggleButton
      expanded={isExpanded}
      onClick={handleToggle}
      config={toggle}
      hiddenCount={types.length - maxVisible}
      textColor={textColor}
    />
  );

  switch (displayType) {
    case 'pills':
      return (
        <div className={`flex flex-wrap gap-1 items-center ${className}`}>
          {visibleTypes.map((type, index) => (
            <span
              key={index}
              className={`rounded-full ${pillSizeClasses[pillSize]} ${textColor} ${bgColor} border border-gray-600`}
            >
              {type}
            </span>
          ))}
          {toggleButton}
        </div>
      );

    case 'list':
      return (
        <div className={className}>
          <ul className={`list-disc list-inside ${textColor}`}>
            {visibleTypes.map((type, index) => (
              <li key={index}>{type}</li>
            ))}
          </ul>
          {toggleButton}
        </div>
      );

    case 'text':
    default:
      return (
        <span className={`${textColor} ${className}`}>
          {visibleTypes.join(', ')}
          {toggleButton}
        </span>
      );
  }
}; 