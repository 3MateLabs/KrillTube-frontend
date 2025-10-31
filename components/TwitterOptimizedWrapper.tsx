'use client'

import { useEffect, useState, ReactNode } from 'react'

interface TwitterOptimizedWrapperProps {
  children: ReactNode
}

export function TwitterOptimizedWrapper({ children }: TwitterOptimizedWrapperProps) {
  const [isTwitterBrowser, setIsTwitterBrowser] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const userAgent = navigator.userAgent || ''
    const isTwitter = /Twitter|FBAN|FBAV/.test(userAgent)
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(userAgent) || window.innerWidth < 768
    
    setIsTwitterBrowser(isTwitter)
    setIsMobile(isMobileDevice)
    
    // Add class to body for Twitter-specific styling
    if (isTwitter || isMobileDevice) {
      document.body.classList.add('twitter-optimized')
    }
    
    // Handle viewport for Twitter browser
    if (isTwitter) {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      }
    }
    
    return () => {
      document.body.classList.remove('twitter-optimized')
    }
  }, [])
  
  return (
    <div className={`${isTwitterBrowser || isMobile ? 'twitter-mobile-view' : ''}`}>
      {children}
    </div>
  )
}