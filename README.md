# Majestic Ops ✨

> Task management system for **Majestic Jewellers**, Kerala, India.

Majestic Ops is a full-featured, mobile-first task management platform purpose-built for jewellery shop operations. It supports real-time collaboration, AI-powered task management, Malayalam voice input/readback, offline-first architecture, and a TV control-room display — all designed around the daily workflow of a jewellery business.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS v4 |
| **State** | Zustand, TanStack Query |
| **Backend** | Supabase (Postgres, Auth, Realtime, Edge Functions, Storage) |
| **AI** | Google Gemini API |
| **Hosting** | Vercel |
| **i18n** | i18next (English + Malayalam) |
| **Charts** | Recharts |
| **Icons** | Lucide React |

## Features

- **22+ pages** — Dashboard, Tasks (list / board / calendar), Approvals, Routines, Templates, Projects, AI Manager, Live Board (TV Mode), People, Messages, Reports, EOD, Notifications, Settings, Profile, and more
- **Task Lifecycle** — Draft → New → Seen → In Progress → Blocked → Submitted → Sent Back → Done / Cancelled with drag-and-drop Kanban board
- **AI Manager** — AI-generated alerts inbox and Ask AI conversational chat powered by Gemini
- **Malayalam Voice** — Voice-to-task creation and TTS readback via Web Speech API and Supabase Edge Functions
- **Real-Time** — Live subscriptions for tasks, notifications, announcements, and the control-room TV board
- **Offline Support** — IndexedDB-backed offline queue with background sync via service worker
- **Proof System** — Photo/file proof submission with approval workflow
- **Reports & Dashboards** — Interactive charts, EOD reports, leaderboard, senior-friendly large-text mode
- **Routines & Templates** — Recurring task routines with cron scheduling, reusable task templates and chains
- **Role-Based Access** — Owner, Manager, Craftsman, Billing, Security roles with route guards
- **Settings** — 9-tab settings panel (Shop, Departments, Users, Holidays, Roles, Notifications, AI, Voice, System)
- **Keyboard Shortcuts** — Power-user keyboard navigation throughout the app
- **PWA-Ready** — Service worker, push notifications, installable

## Prerequisites

- **Node.js** 20+ and npm
- **Supabase** account ([supabase.com](https://supabase.com))
- **Vercel** account ([vercel.com](https://vercel.com)) — for deployment

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/majestic-ops.git
cd majestic-ops
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration files in order:

```bash
# In the Supabase SQL editor, run:
supabase/migrations/00001_initial_schema.sql
supabase/migrations/00002_rpc_functions.sql
```

Or using the Supabase CLI:

```bash
npx supabase db push
```

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values (see [Environment Variables](#environment-variables) below).

### 5. Start the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public API key |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key for web push notifications |

Create a `.env.local` file in the project root (see `.env.example` for the template). **Never commit `.env.local`** — it is already in `.gitignore`.

## Deployment (Vercel)

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Set the **Framework Preset** to **Vite**
4. Add all environment variables from the table above in the Vercel dashboard under **Settings → Environment Variables**
5. Deploy — Vercel will automatically build and serve the app
6. The included `vercel.json` handles SPA rewrites and service worker cache headers

## Project Structure

```
majestic-ops/
├── public/
│   └── sw.js                  # Service worker
├── src/
│   ├── app/
│   │   └── router.tsx         # Route definitions
│   ├── assets/                # Static assets
│   ├── components/
│   │   ├── ui/                # Base UI components (Button, Input, Card, Dialog, etc.)
│   │   ├── StatusPill.tsx     # Task status indicator
│   │   ├── TimingBadge.tsx    # Timing type badge
│   │   ├── PersonAvatar.tsx   # Avatar with availability dot
│   │   └── EmptyState.tsx     # Empty state placeholder
│   ├── features/
│   │   ├── ai/                # AI Manager (alerts inbox, Ask AI chat)
│   │   ├── approvals/         # Task approval workflow
│   │   ├── auth/              # Login, PIN auth, onboarding
│   │   ├── dashboard/         # Home dashboard, senior mode
│   │   ├── live-board/        # TV control-room display
│   │   ├── messages/          # Internal messaging
│   │   ├── notifications/     # Notification center
│   │   ├── people/            # Staff directory
│   │   ├── pinned-note/       # Pinned note widget
│   │   ├── projects/          # Project management
│   │   ├── reports/           # Charts, EOD reports, leaderboard
│   │   ├── routines/          # Recurring routines
│   │   ├── settings/          # 9-tab settings panel
│   │   ├── tasks/             # Task CRUD, board, calendar, listen
│   │   └── voice/             # Voice-to-task, TTS
│   ├── i18n/                  # en.json, ml.json translations
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client
│   │   └── utils.ts           # Utility functions (cn, etc.)
│   ├── types/
│   │   └── database.ts        # Database type definitions
│   ├── App.tsx                # Root component
│   ├── index.css              # Tailwind + design tokens
│   └── main.tsx               # Entry point + SW registration
├── supabase/
│   └── migrations/            # SQL migration files
├── docs/
│   ├── SPEC.md                # Full project specification
│   ├── CHANGELOG.md           # Release changelog
│   ├── USER_GUIDE.md          # End-user guide (EN + Malayalam)
│   └── ADMIN_GUIDE.md         # Admin/owner guide
├── .env.example               # Environment variable template
├── vercel.json                # Vercel deployment config
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run linter |

## License

MIT © Majestic Jewellers
