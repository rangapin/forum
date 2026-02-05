# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Freediving Forum — a modern, ad-free community forum dedicated to freediving.

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4
- **Backend:** Supabase (Postgres, Auth, Realtime, Storage)
- **Deployment:** Vercel + Supabase (free tiers)

## Commands

- `npm run dev` — Start dev server (http://localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — TypeScript type check
- `npx supabase gen types typescript --linked > src/lib/types/database.ts` — Regenerate DB types

## Architecture

Design document: `docs/plans/2026-02-05-freediving-forum-design.md`

**Key decisions from design doc:**
- Supabase Auth handles email/password, magic link, and Google OAuth
- All tables use Supabase RLS policies for security
- Replies are flat (not nested/threaded)
- Markdown content rendered with `react-markdown` + `rehype-sanitize`
- Mobile-first responsive design, card-based layout, Inter font
- 5 forum categories: General Discussion, Training & Technique, Gear & Equipment, Spots & Travel, Beginner Questions

**Database tables:** users, categories, posts, replies, reports

**Routes:** `/` (home feed), `/c/[category]`, `/post/[id]`, `/new`, `/profile/[username]`, `/auth/login`, `/auth/signup`, `/search`

## Project Structure

- `src/app/` — Next.js App Router pages and server actions
- `src/components/` — Shared React components (server and client)
- `src/lib/supabase/` — Supabase client initialization (server.ts, client.ts, middleware.ts)
- `src/lib/types/` — TypeScript types (database.ts)
- `src/lib/categories.ts` — Category config with color mappings
- `supabase/migrations/` — SQL migration files
