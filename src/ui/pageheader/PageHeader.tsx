import { FC } from 'react';

interface PageHeaderProps {
  title: string;
}

const PageHeader: FC<PageHeaderProps> = ({ title }) => {
  return (
    <header className="page-header">
      <h1>{title}</h1>
    </header>
  );
};

export default PageHeader; 