'use client'

import { useState } from 'react'
import { TradingPanel } from './TradingPanel'
import { VideoPlayerEmbed } from './VideoPlayerEmbed'
import { ShareOnX } from './ShareOnX'
import { ExternalLink, Play, DollarSign, TrendingUp, Users, Eye } from 'lucide-react'

interface VideoData {
  id: string
  title: string
  description?: string
  blobIds?: string[]
  walrusMasterUri?: string
  views?: number
  createdAt: string
  status?: string
  walCost?: number
  usdCost?: number
}

interface XCardInterfaceProps {
  video: VideoData
  refCode: string | null
}

export function XCardInterface({ video, refCode }: XCardInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'watch' | 'trade'>('watch')
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
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
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                WALPLAYER
              </div>
              <div className="text-xs text-gray-500">on X</div>
            </div>
            <button
              onClick={() => window.open(`/watch/${video.id}`, '_blank')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Full Site
            </button>
          </div>
        </div>
      </div>
      
      {/* Video Info Bar */}
      <div className="border-b border-gray-800 bg-gray-900/30">
        <div className="px-4 py-2">
          <h1 className="text-sm font-semibold text-white truncate">{video.title}</h1>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Eye className="w-3 h-3" />
              <span>{formatNumber(video.views || 0)} views</span>
            </div>
            <div className="text-xs text-gray-400">
              {formatDate(video.createdAt)}
            </div>
            {video.walCost && (
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <DollarSign className="w-3 h-3" />
                <span>{video.walCost.toFixed(2)} WAL</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Tab Switcher */}
      <div className="border-b border-gray-800">
        <div className="flex">
          <button
            onClick={() => setActiveTab('watch')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'watch'
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/30'
            }`}
          >
            <Play className="w-4 h-4" />
            Watch
          </button>
          <button
            onClick={() => setActiveTab('trade')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'trade'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-900/50'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/30'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Trade
          </button>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'watch' ? (
          <div className="h-full">
            <VideoPlayerEmbed video={video} />
            <div className="p-4 space-y-3">
              <div className="p-3 bg-gray-900/50 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Description</h3>
                <p className="text-sm text-gray-300">{video.description || 'No description available'}</p>
              </div>
            </div>
          </div>
        ) : (
          <TradingPanel video={video} refCode={refCode} />
        )}
      </div>
      
      {/* Footer */}
      <div className="border-t border-gray-800 bg-gray-900/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <ShareOnX video={video} refCode={refCode} />
          {refCode && (
            <div className="text-xs text-gray-500">
              Referral: <span className="text-purple-400">{refCode}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}