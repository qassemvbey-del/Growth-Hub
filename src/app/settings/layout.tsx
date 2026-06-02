import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Settings | Growth Hub",
  description: "Configure your workspace, sound settings, PWA setup, and coach parameters.",
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
