'use client';

import { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileLayout } from './MobileLayout';
import { TwitterOptimizedWrapper } from './TwitterOptimizedWrapper';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
      const isTwitter = /Twitter|FBAN|FBAV/.test(userAgent);
      const isMobileDevice = typeof window !== 'undefined' && (
        /iPhone|iPad|iPod|Android/i.test(userAgent) || window.innerWidth < 768
      );
      setIsMobile(isTwitter || isMobileDevice);
    };
    
    checkMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  return (
    <TwitterOptimizedWrapper>
      {isMobile ? (
        <MobileLayout>{children}</MobileLayout>
      ) : (
        <>
          <Header onMenuClick={toggleSidebar} />
          <div className="flex min-h-screen bg-background">
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            <main className="flex-1 min-h-screen lg:ml-64 pt-[60px] bg-background">
              {children}
            </main>
          </div>
        </>
      )}
    </TwitterOptimizedWrapper>
  );
}
