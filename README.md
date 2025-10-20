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

Copy the example environment file and fill in your actual values:

```bash
cp .env.example .env.local
```

**Required Variables:**
- Supabase: URL, anon key, service role key (from [Supabase Dashboard](https://app.supabase.com/project/_/settings/api))
- Stripe: Secret key, publishable key, webhook secret, price IDs (from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys))
- AI Keys: At least one of Anthropic, OpenAI, or DeepSeek API keys

See `.env.example` for detailed documentation and all available options.

**⚠️ Security Warning:**
- NEVER commit `.env.local` or any file containing real API keys to git
- Use test keys (sk_test_, pk_test_) for development
- Rotate keys immediately if accidentally exposed
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

3. Add environment variables in Vercel Dashboard → Settings → Environment Variables

Reference `.env.example` for the complete list of required and optional variables. Make sure to use **production keys** (not test keys) for the production environment.

**Critical Variables:**
- All Supabase keys (URL, anon key, service role key)
- All Stripe keys (secret, publishable, webhook secret, price IDs)
- At least one AI provider key (Anthropic/OpenAI/DeepSeek)
- Set `NEXT_PUBLIC_APP_URL` to your production domain

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
