import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Shield, ShieldCheck, ShieldAlert, Crown, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VerificationStatus, VerificationLevel } from '@/lib/submissions/partner-verification'

interface VerificationBadgeProps {
  status: VerificationStatus
  level?: VerificationLevel
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function VerificationBadge({
  status,
  level,
  className,
  showLabel = true,
  size = 'md',
}: VerificationBadgeProps) {
  if (status !== 'verified' || !level) {
    // Show unverified state
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                'gap-1',
                {
                  'text-xs py-0 px-2': size === 'sm',
                  'text-sm py-0.5 px-2.5': size === 'md',
                  'text-base py-1 px-3': size === 'lg',
                },
                className
              )}
            >
              {status === 'pending' ? (
                <>
                  <Shield className={cn('h-3 w-3', { 'h-4 w-4': size === 'lg' })} />
                  {showLabel && 'Pending'}
                </>
              ) : status === 'rejected' ? (
                <>
                  <ShieldAlert className={cn('h-3 w-3 text-red-500', { 'h-4 w-4': size === 'lg' })} />
                  {showLabel && 'Rejected'}
                </>
              ) : (
                <>
                  <ShieldOff className={cn('h-3 w-3 text-gray-400', { 'h-4 w-4': size === 'lg' })} />
                  {showLabel && 'Unverified'}
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {status === 'pending'
                ? 'Verification request pending review'
                : status === 'rejected'
                  ? 'Verification request was rejected'
                  : 'This partner has not been verified'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Show verified badge based on level
  const badgeConfig = {
    basic: {
      label: 'Verified',
      color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
      icon: ShieldCheck,
      description: 'Email and website verified',
    },
    standard: {
      label: 'Standard',
      color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
      icon: ShieldCheck,
      description: 'Industry association member with verified credentials',
    },
    premium: {
      label: 'Premium',
      color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
      icon: ShieldCheck,
      description: 'Established track record with verified sales history',
    },
    elite: {
      label: 'Elite',
      color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
      icon: Crown,
      description: 'Prominent agency/publisher with established industry reputation',
    },
  }

  const config = badgeConfig[level]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'gap-1',
              config.color,
              {
                'text-xs py-0 px-2': size === 'sm',
                'text-sm py-0.5 px-2.5': size === 'md',
                'text-base py-1 px-3': size === 'lg',
              },
              className
            )}
          >
            <Icon className={cn('h-3 w-3', { 'h-4 w-4': size === 'lg' })} />
            {showLabel && config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{config.label} Verified Partner</p>
          <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
