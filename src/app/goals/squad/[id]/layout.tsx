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
    // const { data: mission } = await supabase
    //   .from('cups')
    //   .select('title')
    //   .eq('id', id)
    //   .single()
    const { data: mission } = await supabase
      .from('goals')
      .select('title')
      .eq('id', id)
      .single()

    const title = mission?.title ? `Mission: ${mission.title}` : 'Mission Tracker'
    const imageUrl = `/api/missions/${id}/og`

    return {
      title,
      description: 'Track my operational growth on this mission in real-time.',
      openGraph: {
        title,
        description: 'Track my operational growth on this mission in real-time.',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: 'Track my operational growth on this mission in real-time.',
        images: [imageUrl],
      },
    }
  } catch (err) {
    console.error('GENERATE_METADATA_FAILED:', err)
    return {
      title: 'Mission Tracker',
    }
  }
}

export default function MissionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
