# Majestic Ops — Changelog

All notable changes to this project will be documented in this file.

## [0.7.0] - 2026-11-12

### Phase 7 — Hardening
- Offline queue with IndexedDB storage and automatic background sync
- Service worker for app-shell caching, push notifications, and background sync
- Keyboard shortcuts throughout the app (navigation, task actions, search)
- Settings panel expanded to 9 tabs: Shop, Departments, Users, Holidays, Roles, Notifications, AI, Voice, System
- PWA support — installable, works offline

## [0.6.0] - 2026-11-12

### Phase 6 — AI Manager & Voice
- AI Alerts inbox — auto-generated intelligent alerts from Gemini
- Ask AI chat interface for conversational task assistance
- Voice-to-task creation using Web Speech API (English + Malayalam)
- Malayalam TTS readback via Supabase Edge Functions
- Task Listen page with large senior-friendly text and 🔊 button
- Gemini-powered edge functions for AI analysis and text-to-speech

## [0.5.0] - 2026-11-12

### Phase 5 — Dashboards & Reports
- Home dashboard with stats cards, charts, and recent activity
- Senior-friendly mode with large text and simplified layout
- Reports page with interactive Recharts visualizations
- End-of-Day (EOD) report submission and viewing
- Staff leaderboard with performance metrics

## [0.4.0] - 2026-11-12

### Phase 4 — Workflows
- Task templates — create reusable task blueprints
- Template chains — multi-step task sequences
- Routines — recurring tasks with cron-based scheduling
- Routine management page with enable/disable and scheduling UI

## [0.3.0] - 2026-11-12

### Phase 3 — Alerts & Notifications
- Pinned note widget on dashboard (owner-editable, visible to all)
- Notification center with real-time badge count
- Real-time Supabase subscriptions for live task and notification updates
- Announcement system for shop-wide messages

## [0.2.0] - 2026-11-12

### Phase 2 — Task Core
- Full task lifecycle (Draft → New → Seen → In Progress → Blocked → Submitted → Sent Back → Done / Cancelled)
- Task list view with filtering, sorting, and search
- Drag-and-drop Kanban board view
- Calendar view for dated tasks
- Proof submission and approval system (photo/file uploads)
- Task comments and activity feed
- RPC functions for task assignment, status transitions, and bulk operations

## [0.1.0] - 2026-11-12

### Phase 0 — Scaffold
- Created React 18 + Vite + TypeScript project
- Installed all dependencies (Tailwind, shadcn/ui, React Router, TanStack Query, Supabase, Zustand, i18next, etc.)
- Set up folder structure per spec
- Created database schema migration (Phase 1 tables)
- Set up Supabase configuration
- Created design system tokens and UI components
- Set up i18n (English + Malayalam)
- Copied spec to docs/SPEC.md

### Phase 1 — Foundation
- Auth system (email + password, PIN login)
- Onboarding flow (language, shift, notifications, privacy)
- App layout (sidebar, topbar, mobile tabs)
- Settings pages (shop, departments, users, holidays)
- Role-based route guards
- Design system components (Button, Input, Badge, Card, Dialog, Avatar, StatusPill, TimingBadge, etc.)
- Seed data (8 departments, demo users)
