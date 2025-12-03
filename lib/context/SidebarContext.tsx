'use client';

import { createContext, useContext } from 'react';

interface SidebarContextType {
  isSidebarCollapsed: boolean;
  isFullyHidden: boolean;
}

const SidebarContext = createContext<SidebarContextType>({
  isSidebarCollapsed: false,
  isFullyHidden: false,
});

export function SidebarProvider({
  children,
  isSidebarCollapsed,
  isFullyHidden,
}: {
  children: React.ReactNode;
  isSidebarCollapsed: boolean;
  isFullyHidden: boolean;
}) {
  return (
    <SidebarContext.Provider value={{ isSidebarCollapsed, isFullyHidden }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  return useContext(SidebarContext);
}
