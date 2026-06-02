import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Notes | Growth Hub",
  description: "Organize your study guides, course summaries, and squad notes.",
}

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
