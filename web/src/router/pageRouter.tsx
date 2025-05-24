import React from 'react';
import { useNavigation } from './routerContext';

type PageComponent = React.ComponentType;

interface PageRouterProps {
  pages: Record<string, PageComponent>;
  defaultPageId: string;
}

export const PageRouter: React.FC<PageRouterProps> = ({ pages, defaultPageId }) => {
  const { currentPageId } = useNavigation();
  
  const Page = pages[currentPageId] || pages[defaultPageId];
  
  return <Page />;
};