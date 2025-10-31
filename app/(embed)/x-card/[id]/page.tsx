'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { XCardInterface } from '@/components/XCardInterface'
import { useQuery } from '@tanstack/react-query'

interface VideoData {
  id: string
  title: string
  description: string
  blobIds: string[]
  views: number
  createdAt: string
  status: string
  walCost?: number
  usdCost?: number
}

export default function XCardPage({ params }: { params: Promise<{ id: string }> }) {
  const [videoId, setVideoId] = useState<string>('')
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')
  const [isInIframe, setIsInIframe] = useState(false)
  
  useEffect(() => {
    params.then(({ id }) => setVideoId(id))
  }, [params])
  
  const { data: video, isLoading, error } = useQuery<VideoData>({
    queryKey: ['video', videoId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/videos/${videoId}`)
      if (!response.ok) throw new Error('Failed to fetch video')
      return response.json()
    },
    enabled: !!videoId
  })
  
  useEffect(() => {
    const checkIframe = setTimeout(() => {
      const inIframe = window.self !== window.top
      setIsInIframe(inIframe)
      
      if (!inIframe && window.location.pathname.includes('x-card')) {
        window.location.replace(`/watch/${videoId}${refCode ? `?ref=${refCode}` : ''}`)
      }
    }, 100)
    
    return () => clearTimeout(checkIframe)
  }, [videoId, refCode])
  
  useEffect(() => {
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.body.style.margin = ''
      document.body.style.padding = ''
      document.body.style.overflow = ''
    }
  }, [])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white">Loading...</div>
      </div>
    )
  }
  
  if (error || !video) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-white">Video not found</div>
      </div>
    )
  }
  
  return (
    <div className="h-screen overflow-hidden bg-black">
      <XCardInterface video={video} refCode={refCode} />
    </div>
  )
}