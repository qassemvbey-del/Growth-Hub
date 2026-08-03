import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase-admin'

interface Props {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = createAdminClient()
    const { data: mission } = await supabase
      .from('goals')
      .select('title')
      .eq('id', id)
      .single()

    const title = mission?.title ? `[Test Board] Mission: ${mission.title}` : 'Mission Board Test'
    const imageUrl = `/api/missions/${id}/og`

    return {
      title,
      description: 'Experimental interactive board test page.',
      openGraph: {
        title,
        description: 'Experimental interactive board test page.',
        images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
        type: 'website',
      },
    }
  } catch (err) {
    return {
      title: 'Mission Board Test',
    }
  }
}

export default function TestMindmapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
