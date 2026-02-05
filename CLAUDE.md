# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Freediving Forum — a modern, ad-free community forum dedicated to freediving. Currently in pre-implementation (design document only, no code yet).

## Tech Stack

- **Frontend:** Next.js (React) + Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Realtime, Storage)
- **Deployment:** Vercel + Supabase (free tiers)

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

**Routes:** `/` (home feed), `/c/[category]`, `/post/[id]`, `/new`, `/profile/[username]`, `/auth/login`, `/auth/signup`
