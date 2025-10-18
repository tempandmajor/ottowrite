import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe/config'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      throw profileError
    }

    const stripe = getStripeClient()

    let customerId = profile?.stripe_customer_id ?? null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Failed to create customer portal session:', error)
    return NextResponse.json({ error: 'Failed to open customer portal' }, { status: 500 })
  }
}
