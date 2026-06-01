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
      const pathMatch = urlObj.pathname.match(/\/(embed|v)\/([a-zA-Z0-9_-]{11})/)
      if (pathMatch && pathMatch[2]) {
        return `https://www.youtube.com/embed/${pathMatch[2]}`
      }
      
    } catch (e) {
      // Fallback for raw 11-character IDs or already valid embed URLs
      if (rawUrl.length === 11) {
        return `https://www.youtube.com/embed/${rawUrl}`
      }
    }
    
    // If all else fails, just return the raw URL (might already be an embed link)
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


