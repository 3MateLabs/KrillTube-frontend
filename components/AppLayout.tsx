'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useMultiChainAuth } from '@/lib/hooks/useMultiChainAuth';
import { SidebarProvider } from '@/lib/context/SidebarContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  // Initialize multi-chain wallet authentication
  const walletAuth = useMultiChainAuth();

  // Check if we're on an unseal scroll page (scrolls/[id])
  const isUnsealScrollPage = pathname?.match(/^\/scrolls\/[^/]+$/);

  // On unseal scroll pages, collapsed sidebar should be fully hidden
  const shouldFullyHideSidebar = isUnsealScrollPage && isSidebarCollapsed;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        hideWhenCollapsed={!!isUnsealScrollPage}
      />
      <Header
        onMenuClick={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSidebarCollapsed={isSidebarCollapsed}
        showHamburgerOnly={!!shouldFullyHideSidebar}
      />
      <div className="flex min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
        <main className={`flex-1 min-h-screen pt-[60px] bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] transition-all duration-300 ${shouldFullyHideSidebar ? 'lg:ml-0' : isSidebarCollapsed ? 'lg:ml-[160px]' : 'lg:ml-[320px]'}`}>
          <SidebarProvider isSidebarCollapsed={isSidebarCollapsed} isFullyHidden={!!shouldFullyHideSidebar}>
            {children}
          </SidebarProvider>
        </main>
      </div>
    </>
  );
}
