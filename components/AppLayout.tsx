'use client';

import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useWalletAuth } from '@/lib/hooks/useWalletAuth';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize wallet authentication
  const walletAuth = useWalletAuth();

  // Debug logging
  console.log('[AppLayout] Wallet Auth State:', {
    isAuthenticated: walletAuth.isAuthenticated,
    isLoading: walletAuth.isLoading,
    address: walletAuth.address,
    error: walletAuth.error,
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <>
      <Header onMenuClick={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <div className="flex min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <main className={`flex-1 min-h-screen ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-28'} pt-[88px] bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] transition-all duration-300`}>
          {children}
        </main>
      </div>
    </>
  );
}
