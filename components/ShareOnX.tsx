'use client'

import { Twitter } from 'lucide-react'

interface ShareOnXProps {
  video: {
    id: string
    title?: string
  }
  refCode: string | null
}

export function ShareOnX({ video, refCode }: ShareOnXProps) {
  const handleShare = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const embedUrl = `${baseUrl}/api/twitter/embed/${video.id}${refCode ? `?ref=${refCode}` : ''}`
    
    const shareText = `Check out "${video.title || 'this video'}" on @walplayer! You can watch and trade directly from X.`
    
    const twitterUrl = new URL('https://x.com/intent/tweet')
    twitterUrl.searchParams.set('text', shareText)
    twitterUrl.searchParams.set('url', embedUrl)
    
    window.open(twitterUrl.toString(), '_blank', 'noopener,noreferrer,width=550,height=420')
  }
  
  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-full transition-colors"
    >
      <Twitter className="w-4 h-4" />
      Share on X
    </button>
  )
}