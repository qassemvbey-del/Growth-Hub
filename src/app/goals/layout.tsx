import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Missions | Growth Hub",
  description: "Plan your missions, map your courses, and level up your skills.",
}

export default function MissionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
