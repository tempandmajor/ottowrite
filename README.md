# Ottowrite - AI-Powered Writing Assistant

An intelligent writing assistant for novelists, screenwriters, and content creators. Write better and faster with multi-model AI assistance.

## Features

- 🔐 **Authentication** - Secure user registration and login with Supabase
- 📊 **Dashboard** - Track your projects, documents, and AI usage
- 📝 **Projects** - Organize novels, screenplays, and writing projects
- 🤖 **Multi-Model AI** - Claude Sonnet 4.5, GPT-5, DeepSeek V3 integration
- 🗺️ **World Building** - Catalogue locations and timeline events
- ⚫⚪ **Black & White Theme** - Clean, distraction-free interface

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Payments**: Stripe
- **Deployment**: Vercel
- **AI Models**: Anthropic Claude, OpenAI GPT, DeepSeek

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Vercel account (for deployment)

### Local Development

1. Clone the repository:
\`\`\`bash
git clone https://github.com/tempandmajor/ottowrite.git
cd ottowrite
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:

Create a `.env.local` file in the root directory (see `VERCEL_ENV_VARS.md` for the authoritative checklist and secret sources):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Server-only keys (never expose in the browser)
SUPABASE_ANON_KEY=your_supabase_anon_key         # optional fallback for SSR
SUPABASE_URL=your_supabase_url                         # optional fallback for SSR
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRICE_HOBBYIST=price_id_for_hobbyist_plan
STRIPE_PRICE_PROFESSIONAL=price_id_for_professional_plan
STRIPE_PRICE_STUDIO=price_id_for_studio_plan
# Optional AI vendor keys
# ANTHROPIC_API_KEY=your_anthropic_api_key
# OPENAI_API_KEY=your_openai_api_key
# DEEPSEEK_API_KEY=your_deepseek_api_key
```
4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Storybook

Storybook captures the UI states used for QA and design reviews.

```bash
npm run storybook            # launch interactive Storybook
npm run build-storybook      # generate static bundle (CI equivalent)
```

### Deployment to Vercel

1. Push your code to GitHub

2. Import the project to Vercel

3. Add the required variables in Vercel Dashboard → Settings → Environment Variables (Production, Preview, Development):

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_HOBBYIST`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_STUDIO`
- Optional AI vendors: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`
4. Deploy!

### Apply database migrations

Run the Supabase migrations before starting the app (locally and in your deployment pipeline):

```bash
npx supabase db push
```

This ensures the world-building tables (`locations`, `location_events`) from migration `20251017000010_world_building.sql` are available.

## Database Schema

The application uses the following tables in Supabase:

- `user_profiles` - User subscription tiers, billing identifiers, and AI usage
- `projects` - Writing projects (novels, screenplays, etc.)
- `documents` - Individual documents within projects
- `ai_usage` - AI model usage tracking
- `ai_requests` - AI orchestration telemetry (intent, model choice, latency)

Row Level Security (RLS) is enforced on every table with policies limiting access to the authenticated user. Background jobs and Stripe webhooks use the Supabase service role key to perform privileged updates.

## Project Structure

\`\`\`
ottowrite/
├── app/                  # Next.js App Router
│   ├── auth/            # Authentication pages
│   ├── dashboard/       # Dashboard and protected routes
│   └── page.tsx         # Landing page
├── components/          # Reusable UI components
│   └── ui/             # shadcn/ui components
├── lib/                # Utility functions and clients
│   └── supabase/       # Supabase client configuration
├── middleware.ts       # Auth middleware for route protection
└── public/             # Static assets
\`\`\`

## Operational Scripts

- `scripts/stripe-webhook-replay.sh` — replay key Stripe events locally (`stripe trigger checkout.session.completed`).
- `scripts/supabase-smoke-test.sh` — dry-run Supabase migrations and lint SQL before deploying.

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
