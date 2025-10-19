'use client'

import { useState } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { CreditCard, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

type ManageSubscriptionButtonProps = ButtonProps & {
  label?: string
  showIcon?: boolean
}

export function ManageSubscriptionButton({
  label = 'Manage subscription',
  showIcon = true,
  className,
  variant = 'outline',
  size = 'sm',
  ...buttonProps
}: ManageSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const openPortal = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/checkout/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.status === 401) {
        router.push('/auth/login?redirect=/pricing')
        return
      }

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || typeof payload.url !== 'string') {
        throw new Error(payload.error ?? 'Could not open Stripe portal')
      }

      window.location.href = payload.url
    } catch (error) {
      console.error('Customer portal error:', error)
      toast({
        title: 'Unable to manage subscription',
        description: error instanceof Error ? error.message : 'Please try again shortly.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      {...buttonProps}
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={openPortal}
      disabled={loading || buttonProps.disabled}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        showIcon && <CreditCard className="mr-2 h-4 w-4" />
      )}
      {loading ? 'Opening portal...' : label}
    </Button>
  )
}
