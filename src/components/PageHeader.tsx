import React from 'react'

interface PageHeaderProps {
  title: string
}

const PageHeader: React.FC<PageHeaderProps> = ({ title }) => {
  return (
    <header className="bgPageHeader p-4 rounded-lg shadow">
      <h1 className="text-2xl font-bold">{title}</h1>
    </header>
  )
}

export default PageHeader 