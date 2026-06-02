import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Achievements | Growth Hub",
  description: "Track your XP progress, review unlockable titles, and showcase your rank.",
}

export default function AchievementsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
