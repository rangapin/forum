# Freediving Forum — Design Document

## Overview

A modern, ad-free freediving forum — the go-to online community for freedivers of all levels worldwide. The only forum 100% dedicated to freediving, with a clean modern UI. No ads, no scuba noise, no clutter.

**Target audience:** Both competitive and recreational freedivers — beginners through advanced.

**Business model:** Free to use, no ads. Optional community donations (Patreon/Ko-fi style) if/when it grows.

## Tech Stack

- **Frontend:** Next.js (React) + Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Realtime, Storage)
- **Deployment:** Vercel (free tier) + Supabase (free tier)

## Forum Categories (v1)

1. General Discussion
2. Training & Technique
3. Gear & Equipment
4. Spots & Travel
5. Beginner Questions

## v1 Feature Scope

- Browse and search threads by category
- Create posts, reply to posts (markdown content)
- User profiles (username, avatar, bio)
- Email + password auth, magic link, Google OAuth (Supabase Auth)
- Responsive / mobile-first design
- Flat replies (not nested/threaded)
- Realtime updates (new posts/replies appear live)
- Lightweight moderation (admin role, report button)

## Pages

| Route | Description |
|---|---|
| `/` | Home feed — latest posts across all categories, filterable |
| `/c/[category]` | Category view (e.g. `/c/training-technique`) |
| `/post/[id]` | Single post with replies |
| `/new` | Create a new post |
| `/profile/[username]` | User profile with their posts |
| `/auth/login` | Login page |
| `/auth/signup` | Signup page |

## Database Schema

### users
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, references auth.users |
| username | text | unique |
| avatar_url | text | nullable |
| bio | text | nullable |
| is_admin | boolean | default false |
| created_at | timestamptz | |

### categories
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | |
| slug | text | unique |
| description | text | |
| sort_order | int | |

### posts
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| title | text | |
| body | text | markdown content |
| category_id | uuid | FK -> categories |
| author_id | uuid | FK -> users |
| reply_count | int | default 0 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### replies
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| body | text | markdown content |
| post_id | uuid | FK -> posts |
| author_id | uuid | FK -> users |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### reports
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| reporter_id | uuid | FK -> users |
| post_id | uuid | nullable, FK -> posts |
| reply_id | uuid | nullable, FK -> replies |
| reason | text | |
| created_at | timestamptz | |

## UI & Design Direction

**Visual style (inspired by Cruip Community template):**
- Clean white background, generous whitespace
- Card-based post listing — title, category tag, author, time ago, reply count
- Minimal nav bar — logo/name, category links, search, login/profile
- Soft rounded corners, subtle shadows, modern sans-serif typography (Inter)
- Category color-coding — each category gets a distinct subtle color tag

**Home feed layout:**
- Top bar: category filter pills (All, General, Training, Gear, Spots, Beginners)
- Sort options: Latest, Most Replies
- Post cards in a single-column list
- Floating "New Post" button (mobile) / top-right button (desktop)

**Single post page:**
- Post title, author info, timestamp, category tag at top
- Markdown-rendered body
- Flat list of replies below with author avatar, name, timestamp
- Reply box at the bottom (markdown textarea)

**Mobile-first:**
- Hamburger menu for navigation on small screens
- Full-width post cards
- Sticky bottom bar with New Post action
- Touch-friendly tap targets

## Authentication & Security

**Auth (Supabase Auth):**
- Email + password signup/login
- Magic link (passwordless)
- Google OAuth
- Username picked on signup, stored in public users table

**Security:**
- Supabase RLS policies on every table
- Rate limiting on post/reply creation
- Markdown sanitization via `react-markdown` + `rehype-sanitize`

**Moderation (v1):**
- Admin role flag on users table
- Admins can delete any post or reply
- Report button on posts/replies -> reports table for admin review
- Manual moderation only

## Not in v1 (Future)

- Upvoting / reputation system
- Direct messaging
- User dive stats / personal bests
- Dark mode
- Notifications (email or push)
- Marketplace (buy/sell gear)
- Nested/threaded replies
