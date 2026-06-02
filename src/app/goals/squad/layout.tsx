import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Squad Goals | Growth Hub",
  description: "Coordinate with your team, complete milestones, and win together.",
}

export default function SquadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
