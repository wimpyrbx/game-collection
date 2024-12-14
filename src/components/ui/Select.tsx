import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select: React.FC<SelectProps> = ({ label, children, ...props }) => {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select {...props} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
        {children}
      </select>
    </div>
  );
}; 