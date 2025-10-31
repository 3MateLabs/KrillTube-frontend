'use client'

import { useState } from 'react'
import { CustomVideoPlayer } from './CustomVideoPlayer'
import { Share2, Shield, Info, ChevronDown, DollarSign } from 'lucide-react'
import { formatDuration } from '@/lib/types'

interface MobileWatchViewProps {
  video: any
}

export function MobileWatchView({ video }: MobileWatchViewProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  
  const handleShare = async () => {
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
      window.open(twitterUrl.toString(), '_blank')
    }
    setIsSharing(false)
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  return (
    <div className="min-h-screen bg-black">
      {/* Video Player - Full Width */}
      <div className="w-full">
        <CustomVideoPlayer
          videoId={video.id}
          videoUrl={video.walrusMasterUri}
          title={video.title}
          autoplay={false}
        />
      </div>
      
      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Title and Actions */}
        <div>
          <h1 className="text-lg font-semibold text-white mb-2">{video.title}</h1>
          
          {/* Meta Info */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <span>{formatDuration(video.duration)}</span>
            <span>•</span>
            <span>{formatDate(video.createdAt)}</span>
            {video.walCost && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1 text-emerald-400">
                  <DollarSign className="w-3 h-3" />
                  <span>{video.walCost} WAL</span>
                </div>
              </>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 text-white rounded-full text-sm font-medium active:scale-95 transition-transform"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-800 text-white rounded-full text-sm font-medium active:scale-95 transition-transform">
              <Shield className="w-4 h-4" />
              Encrypted
            </button>
          </div>
        </div>
        
        {/* Creator Info */}
        <div className="twitter-card flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {video.creatorId.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Creator</p>
            <p className="text-xs text-gray-400 font-mono">
              {video.creatorId.slice(0, 8)}...{video.creatorId.slice(-6)}
            </p>
          </div>
        </div>
        
        {/* Encryption Notice */}
        <div className="twitter-card bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-400 mb-1">
                End-to-End Encrypted
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                This video is encrypted with AES-128-GCM and stored on Walrus decentralized network.
              </p>
            </div>
          </div>
        </div>
        
        {/* Available Quality */}
        <div className="twitter-card">
          <h3 className="text-sm font-medium text-white mb-2">Available Quality</h3>
          <div className="space-y-1.5">
            {video.renditions.map((rendition: any) => (
              <div key={rendition.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{rendition.name}</span>
                <span className="text-gray-500">{rendition.resolution}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Technical Details (Collapsible) */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full twitter-card flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-white">Technical Details</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>
        
        {showDetails && (
          <div className="space-y-3 animate-fadeIn">
            {/* Video ID */}
            <div className="twitter-card bg-gray-900">
              <p className="text-xs text-gray-400 mb-1">Video ID</p>
              <p className="text-xs font-mono text-gray-300 break-all">{video.id}</p>
            </div>
            
            {/* Master Playlist */}
            <div className="twitter-card bg-gray-900">
              <p className="text-xs text-gray-400 mb-1">Master Playlist Blob</p>
              <p className="text-xs font-mono text-blue-400 break-all">
                {video.walrusMasterUri.match(/\/([^/]+)$/)?.[1]}
              </p>
            </div>
            
            {/* Segment Count */}
            <div className="twitter-card bg-gray-900">
              <p className="text-xs text-gray-400 mb-1">Total Segments</p>
              <p className="text-xs text-gray-300">
                {video.renditions.reduce((acc: number, r: any) => acc + r.segmentCount, 0)} encrypted segments
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Bottom Padding for Mobile Nav */}
      <div className="h-20" />
    </div>
  )
}