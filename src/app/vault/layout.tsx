import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Vault | Growth Hub",
  description: "Unlock your achievements, store key resources, and check rankings.",
}

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
