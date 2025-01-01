/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'table-border': 'var(--color-table-border)',
        'table-header': 'var(--color-table-header)',
        'table-header-text': 'var(--color-table-header-text)',
        'table-body': 'var(--color-table-body)',
        'table-text': 'var(--color-table-text)',
        'table-row-hover': 'var(--color-table-row-hover)',
        'table-row-selected': 'var(--color-table-row-selected)',
        'table-action-edit': 'var(--color-table-action-edit)',
        'table-action-edit-hover': 'var(--color-table-action-edit-hover)',
        'table-action-delete': 'var(--color-table-action-delete)',
        'table-action-delete-hover': 'var(--color-table-action-delete-hover)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out forwards'
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true })
  ],
} 