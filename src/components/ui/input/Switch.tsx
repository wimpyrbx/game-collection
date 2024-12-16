import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ checked, onChange }: SwitchProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 rounded-full border-2 border-transparent cursor-pointer
        ${checked ? 'bg-green-600' : 'bg-gray-700'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </div>
  );
} 