import React from 'react'

interface SmartTaskPlayerProps {
  taskId: string
  url: string
  initialProgress: number
  isGuest: boolean
  themeColor: string
  onComplete: () => void
  onProgressUpdate?: (currentTime: number, duration: number) => void
}

export default function SmartTaskPlayer({ 
  url, 
  themeColor,
}: SmartTaskPlayerProps) {
  
  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return ''
    
    // If it's already a valid embed link, keep it
    if (rawUrl.includes('youtube.com/embed/')) {
      return rawUrl
    }

    try {
      const urlObj = new URL(rawUrl)
      
      // Handle playlist URLs
      const listId = urlObj.searchParams.get('list')
      if (listId) {
        return `https://www.youtube.com/embed/videoseries?list=${listId}`
      }
      
      // Handle standard youtube.com?v= URLs
      const vParam = urlObj.searchParams.get('v')
      if (vParam) {
        return `https://www.youtube.com/embed/${vParam}`
      }

      // Handle youtu.be short URLs
      if (urlObj.hostname === 'youtu.be') {
        const pathId = urlObj.pathname.slice(1)
        if (pathId) return `https://www.youtube.com/embed/${pathId}`
      }

      // Handle embed or v paths
      const pathMatch = urlObj.pathname.match(/\/(embed|v)\/([a-zA-Z0-9_-]+)/)
      if (pathMatch && pathMatch[2] && pathMatch[2] !== 'videoseries') {
        return `https://www.youtube.com/embed/${pathMatch[2]}`
      }
      
    } catch (e) {
      // Fallback for raw IDs
      if (rawUrl.startsWith('PL')) {
        return `https://www.youtube.com/embed/videoseries?list=${rawUrl}`
      }
      if (rawUrl.length === 11) {
        return `https://www.youtube.com/embed/${rawUrl}`
      }
    }
    
    return rawUrl
  }

  const embedUrl = getEmbedUrl(url)

  return (
    <div className="w-full h-full relative">
      <div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: `inset 0 0 20px ${themeColor}22` }} />
      
      <iframe 
        className="w-full aspect-video rounded-md bg-black" 
        src={embedUrl} 
        frameBorder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowFullScreen
      ></iframe>
    </div>
  )
}


