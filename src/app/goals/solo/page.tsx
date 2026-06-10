'use client'

// import MissionsPage from '@/app/missions/page'
// NOTE: Capacity checks (usedSlots + newSlots > 9) have been commented out within the underlying MissionsPage component
import MissionsPage from '@/app/goals/page'

export default function SoloGoalsPage() {
  return <MissionsPage typeFilter="solo" />
}
