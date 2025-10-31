'use client'

import { useState, useEffect, ReactNode } from 'react'
import { Home, Upload, Library, User, Menu, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { ConnectWallet } from './ConnectWallet'

interface MobileLayoutProps {
  children: ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || ''
      const isTwitter = /Twitter|FBAN|FBAV/.test(userAgent)
      const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(userAgent) || window.innerWidth < 768
      setIsMobile(isTwitter || isMobileDevice)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  if (!isMobile) {
    return <>{children}</>
  }
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/upload', icon: Upload, label: 'Upload' },
    { path: '/library', icon: Library, label: 'Library' },
  ]
  
  return (
    <div className="min-h-screen pb-16">
      {/* Mobile Header */}
      <div className="twitter-mobile-header">
        <div className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          WalPlayer
        </div>
        <div className="flex items-center gap-2">
          <ConnectWallet />
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {/* Side Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="absolute right-0 top-0 h-full w-72 bg-gray-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Menu</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path)
                    setIsMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === item.path 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="px-4 py-4">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <div className="twitter-bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={pathname === item.path ? 'active' : ''}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
        <button className="relative">
          <User className="w-5 h-5" />
          <span>Profile</span>
        </button>
      </div>
    </div>
  )
}