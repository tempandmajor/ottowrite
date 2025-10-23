# Subscription Naming Convention

## Decision: Use `subscription_tier` everywhere

**Date:** 2025-01-29
**Ticket:** FIX-7

## Rationale

We standardize on `subscription_tier` (not `subscription_plan`) for the following reasons:

1. **Semantic Clarity**: "Tier" better represents the hierarchical nature (free < hobbyist < professional < studio)
2. **Industry Standard**: Most SaaS products use "tier" for subscription levels
3. **Existing Usage**: 80+ uses of `subscription_tier` vs 0 uses of `subscription_plan` in TypeScript code
4. **Consistency**: Aligns with user_profiles table which uses `subscription_tier`

## Naming Standards

### Database Columns
- ✅ `subscription_tier` (in user_profiles)
- ✅ `subscription_status` (active, canceled, etc.)
- ✅ `subscription_id` (Stripe subscription ID)

### Database Tables
- ✅ `subscription_tier_limits` (renamed from subscription_plan_limits)
  - Contains limits for each tier (free, hobbyist, professional, studio)
  - Primary key: `tier` column

### TypeScript Types
- ✅ `SubscriptionTier` type: `'free' | 'hobbyist' | 'professional' | 'studio'`
- ✅ Use `tier` or `subscription_tier` in function parameters
- ❌ Avoid: `plan`, `subscription_plan`

### Function Naming
- ✅ `getTierFeatures(tier: SubscriptionTier)`
- ✅ `getTierByPriceId(priceId: string)`
- ✅ `canAccessFeature(tier: SubscriptionTier, feature: string)`
- ❌ Avoid: getPlanFeatures, planLimits, etc.

### Configuration
- ✅ `SUBSCRIPTION_TIERS` object in lib/stripe/config.ts
- Contains tier-specific features and pricing

## Migration Path

For existing code that may reference "plan":

1. **Database**: Rename `subscription_plan_limits` → `subscription_tier_limits`
2. **Code**: Already using `subscription_tier` consistently
3. **Comments**: Update any references to "plan" to say "tier"
4. **Documentation**: Use "subscription tier" in user-facing docs

## Examples

### ✅ Correct
```typescript
const tier = profile.subscription_tier
const features = getTierFeatures(tier)
const limits = await supabase.from('subscription_tier_limits').select('*').eq('tier', tier)
```

### ❌ Incorrect
```typescript
const plan = profile.subscription_plan // wrong field name
const features = getPlanFeatures(plan) // wrong function name
const limits = await supabase.from('subscription_plan_limits') // wrong table name
```

## Exceptions

The only acceptable use of "plan" is in Stripe-related contexts where Stripe's API uses "plan":
- `priceId` from Stripe (but we call them "tiers" in our system)
- Stripe checkout session metadata

## Checklist for New Code

When adding subscription-related code:

- [ ] Use `subscription_tier` not `subscription_plan`
- [ ] Use `SubscriptionTier` type
- [ ] Query `subscription_tier_limits` table
- [ ] Use `tier` as parameter name in functions
- [ ] Comment says "tier" not "plan"
