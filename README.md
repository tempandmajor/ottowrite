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

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# Server-only keys (never expose in the browser)
SUPABASE_ANON_KEY=your_supabase_anon_key         # optional fallback for SSR
SUPABASE_URL=your_supabase_url                         # optional fallback for SSR
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment to Vercel

1. Push your code to GitHub

2. Import the project to Vercel

3. Add the following environment variables in Vercel Dashboard → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Server, Encrypted)
- `SUPABASE_ANON_KEY` (Server, optional fallback)
- `SUPABASE_URL` (Server, optional fallback)
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

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
