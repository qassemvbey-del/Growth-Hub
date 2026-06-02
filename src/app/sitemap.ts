import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://playgrowthhub.com'
  const routes = ['', '/notes', '/missions', '/goals/squad', '/vault', '/achievements', '/settings', '/auth/login']
  
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }))
}
