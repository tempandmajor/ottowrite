'use client'

/**
 * @deprecated This component is deprecated. Use StudioUpgradeRequired from @/components/studio/studio-upgrade-required instead.
 * This file is kept for backward compatibility and will be removed in a future version.
 */

import { StudioUpgradeRequired } from '@/components/studio/studio-upgrade-required'

interface SubmissionsUpgradeRequiredProps {
  currentPlan?: string | null
}

/**
 * @deprecated Use StudioUpgradeRequired with feature="submissions" instead
 */
export function SubmissionsUpgradeRequired({ currentPlan }: SubmissionsUpgradeRequiredProps) {
  return <StudioUpgradeRequired currentPlan={currentPlan} feature="submissions" />
}
