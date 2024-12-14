/** @type {import('tailwindcss').Config} */
export default {
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
    },
  },
  plugins: [],
}