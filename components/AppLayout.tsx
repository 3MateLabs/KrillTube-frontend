'use client';

import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useWalletAuth } from '@/lib/hooks/useWalletAuth';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      <Header onMenuClick={toggleSidebar} />
      <div className="flex min-h-screen bg-background">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 min-h-screen lg:ml-64 pt-[60px] bg-background">
          {children}
        </main>
      </div>
    </>
  );
}
