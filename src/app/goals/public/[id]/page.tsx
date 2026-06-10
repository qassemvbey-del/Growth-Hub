import { redirect } from 'next/navigation'

export default function PublicGoalRedirect({ params }: { params: { id: string } }) {
  // Banish ghost route and redirect all traffic to the unified squad view.
  redirect(`/goals/squad/${params.id}`)
}
