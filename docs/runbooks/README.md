# Operational Runbooks

**Last Updated:** January 19, 2025
**Maintainer:** Engineering Team

## Overview

This directory contains step-by-step operational runbooks for handling common incidents, maintenance tasks, and production procedures.

## Available Runbooks

### Incident Response

1. **[Autosave Incidents](./autosave-incidents.md)**
   - Autosave failures and conflicts
   - Data recovery procedures
   - User notification protocols
   - 🔴 Priority: **CRITICAL** - User data at risk

2. **[AI Worker Failures](./ai-worker-failures.md)**
   - AI generation timeouts
   - OpenAI/Anthropic API failures
   - Rate limit exceeded scenarios
   - Background task recovery
   - 🟡 Priority: **HIGH** - User experience impacted

### Maintenance & Operations

3. **[Stripe Webhook Replay](./stripe-webhook-replay.md)**
   - Missing webhook events
   - Failed payment processing
   - Subscription sync issues
   - 🟡 Priority: **HIGH** - Revenue impact

4. **[Supabase Migration Procedures](./supabase-migration-procedures.md)**
   - Schema changes
   - Data migrations
   - Rollback procedures
   - Testing protocols
   - 🟠 Priority: **MEDIUM** - Planned maintenance

## Quick Reference

### Emergency Contacts

| Service | Contact | Access |
|---------|---------|--------|
| **Sentry** | [Dashboard](https://sentry.io) | Error monitoring |
| **Vercel** | [Dashboard](https://vercel.com) | Deployment & logs |
| **Supabase** | [Dashboard](https://supabase.com) | Database & auth |
| **Stripe** | [Dashboard](https://dashboard.stripe.com) | Payments |

### Common Commands

```bash
# Check application logs
vercel logs [deployment-url]

# Database console
supabase db remote commit

# Replay Stripe webhook
stripe events resend [event-id]

# Run database migration
npm run db:migrate
```

## Incident Priority Levels

| Level | Response Time | Examples |
|-------|--------------|----------|
| 🔴 **CRITICAL** | Immediate (<15 min) | Data loss, service down |
| 🟡 **HIGH** | <1 hour | Feature broken, payment issues |
| 🟠 **MEDIUM** | <4 hours | Performance degradation |
| 🟢 **LOW** | <24 hours | Minor bugs, cosmetic issues |

## Runbook Usage

Each runbook follows this structure:

1. **Symptoms** - How to identify the issue
2. **Impact** - What's affected and severity
3. **Diagnosis** - How to confirm root cause
4. **Resolution** - Step-by-step fix
5. **Prevention** - How to avoid in future
6. **Escalation** - When to escalate and to whom

## Contributing

When adding new runbooks:

1. Use the template in `runbook-template.md`
2. Include actual commands with placeholders
3. Add screenshots for complex procedures
4. Test all commands before committing
5. Update this README with the new runbook

## Related Documentation

- [Security Guide](../SECURITY.md)
- [Performance Audit](../PERFORMANCE_AUDIT.md)
- [Error Reporting](../ERROR_REPORTING.md)
- [API Documentation](../API.md)

---

**Questions?** File an issue or contact the engineering team.
