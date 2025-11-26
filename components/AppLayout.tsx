'use client';

import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useMultiChainAuth } from '@/lib/hooks/useMultiChainAuth';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize multi-chain wallet authentication
  const walletAuth = useMultiChainAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <Header
        onMenuClick={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isSidebarCollapsed={isSidebarCollapsed}
      />
      <div className="flex min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
        <main className={`flex-1 min-h-screen pt-[60px] bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-[160px]' : 'lg:ml-[320px]'}`}>
          {children}
        </main>
      </div>
    </>
  );
}
