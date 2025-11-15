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

  // Initialize multi-chain wallet authentication
  const walletAuth = useMultiChainAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <>
      <Header onMenuClick={toggleSidebar} />
      <div className="flex min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 min-h-screen lg:ml-64 pt-[60px] bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
          {children}
        </main>
      </div>
    </>
  );
}
