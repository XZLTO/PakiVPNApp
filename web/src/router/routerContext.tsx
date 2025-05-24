import React, { createContext, useContext, useState, ReactNode } from 'react';

type NavigationContextType = {
  currentPageId: string;
  navigateTo: (pageId: string) => void;
};

const RouterContext = createContext<NavigationContextType | undefined>(undefined);

export const RouterProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [currentPageId, setCurrentPageId] = useState<string>('home');

  const navigateTo = (pageId: string) => {
    setCurrentPageId(pageId);
  };

  return (
    <RouterContext.Provider value={{ currentPageId, navigateTo }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};