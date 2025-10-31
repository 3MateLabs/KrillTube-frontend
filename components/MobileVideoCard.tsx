'use client'

import { Play, Eye, DollarSign, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface MobileVideoCardProps {
  video: {
    id: string
    title: string
    description?: string
    views: number
    createdAt: string
    walCost?: number
    usdCost?: number
    thumbnail?: string
  }
}

export function MobileVideoCard({ video }: MobileVideoCardProps) {
  const router = useRouter()
  const [isSharing, setIsSharing] = useState(false)
  
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
    return views.toString()
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    if (days < 365) return `${Math.floor(days / 30)} months ago`
    return `${Math.floor(days / 365)} years ago`
  }
  
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsSharing(true)
    
    const shareUrl = `${window.location.origin}/watch/${video.id}`
    const shareText = `Check out "${video.title}" on @walplayer!`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: shareText,
          url: shareUrl,
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      const twitterUrl = new URL('https://x.com/intent/tweet')
      twitterUrl.searchParams.set('text', shareText)
      twitterUrl.searchParams.set('url', shareUrl)
      window.open(twitterUrl.toString(), '_blank', 'noopener,noreferrer,width=550,height=420')
    }
    
    setIsSharing(false)
  }
  
  return (
    <div 
      className="twitter-card cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => router.push(`/watch/${video.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-3">
        {video.thumbnail ? (
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <Play className="w-12 h-12 text-gray-600" />
          </div>
        )}
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
            <Play className="w-7 h-7 text-black ml-1" fill="currentColor" />
          </div>
        </div>
        
        {/* Price Badge */}
        {video.walCost && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            <span className="text-xs font-medium text-white">{video.walCost} WAL</span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="space-y-2">
        <h3 className="font-semibold text-white line-clamp-2">{video.title}</h3>
        
        {video.description && (
          <p className="text-sm text-gray-400 line-clamp-2">{video.description}</p>
        )}
        
        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{formatViews(video.views)}</span>
            </div>
            <span>•</span>
            <span>{formatDate(video.createdAt)}</span>
          </div>
          
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <Share2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}