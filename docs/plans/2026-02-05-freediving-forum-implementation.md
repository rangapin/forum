# Freediving Forum v1 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete, deployable freediving forum with auth, posts, replies, realtime updates, and moderation — as specified in `docs/plans/2026-02-05-freediving-forum-design.md`.

**Architecture:** Next.js 14+ App Router with server components by default, client components only where interactivity is needed. Supabase handles Postgres, Auth, Realtime, and Storage. Supabase client is initialized via `@supabase/ssr` for proper cookie-based auth in both server and client contexts. All database access goes through Supabase client (no direct Postgres connections). RLS policies enforce authorization at the database level.

**Tech Stack:** Next.js 14+ (App Router), React 18+, Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), `react-markdown` + `rehype-sanitize` for markdown rendering, TypeScript throughout.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `next.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `.env.local.example`
- Create: `.gitignore`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: Project scaffolded with `src/app/` directory, Tailwind configured, TypeScript enabled.

**Step 2: Verify it runs**

Run:
```bash
npm run dev
```

Expected: Dev server starts on http://localhost:3000, default Next.js page renders.

**Step 3: Create `.env.local.example`**

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Step 4: Update `.gitignore`**

Ensure `.env.local` is in `.gitignore` (create-next-app includes it by default, verify).

**Step 5: Add Inter font to layout**

Modify: `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Freediving Forum",
  description: "The community for freedivers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 6: Replace default page with placeholder**

Modify: `src/app/page.tsx`

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-bold">Freediving Forum</h1>
    </main>
  );
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with TypeScript and Tailwind"
```

---

## Task 2: Supabase Project Setup

**Files:**
- Create: `.env.local` (not committed)
- Create: `supabase/migrations/00001_initial_schema.sql`

**Step 1: Create Supabase project**

Go to https://supabase.com/dashboard and create a new project. Note the project URL and anon key from Settings > API.

**Step 2: Create `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Step 3: Install Supabase CLI**

Run:
```bash
npm install supabase --save-dev
npx supabase init
```

Expected: `supabase/` directory created with config.

**Step 4: Write initial migration**

Create: `supabase/migrations/00001_initial_schema.sql`

```sql
-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  sort_order int not null default 0
);

alter table public.categories enable row level security;

create policy "Categories are viewable by everyone"
  on public.categories for select
  using (true);

-- Users
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique,
  avatar_url text,
  bio text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users are viewable by everyone"
  on public.users for select
  using (true);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category_id uuid not null references public.categories on delete cascade,
  author_id uuid not null references public.users on delete cascade,
  reply_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert
  with check (auth.uid() = author_id);

create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = author_id);

create policy "Users can delete own posts"
  on public.posts for delete
  using (auth.uid() = author_id);

create policy "Admins can delete any post"
  on public.posts for delete
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.is_admin = true
    )
  );

-- Replies
create table public.replies (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  post_id uuid not null references public.posts on delete cascade,
  author_id uuid not null references public.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.replies enable row level security;

create policy "Replies are viewable by everyone"
  on public.replies for select
  using (true);

create policy "Authenticated users can create replies"
  on public.replies for insert
  with check (auth.uid() = author_id);

create policy "Users can update own replies"
  on public.replies for update
  using (auth.uid() = author_id);

create policy "Users can delete own replies"
  on public.replies for delete
  using (auth.uid() = author_id);

create policy "Admins can delete any reply"
  on public.replies for delete
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.is_admin = true
    )
  );

-- Reply count trigger
create or replace function public.update_reply_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set reply_count = reply_count + 1 where id = NEW.post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.posts set reply_count = reply_count - 1 where id = OLD.post_id;
    return OLD;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_reply_change
  after insert or delete on public.replies
  for each row execute function public.update_reply_count();

-- Reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users on delete cascade,
  post_id uuid references public.posts on delete cascade,
  reply_id uuid references public.replies on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint report_target check (post_id is not null or reply_id is not null)
);

alter table public.reports enable row level security;

create policy "Authenticated users can create reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "Admins can view reports"
  on public.reports for select
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.is_admin = true
    )
  );

create policy "Admins can delete reports"
  on public.reports for delete
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.is_admin = true
    )
  );

-- Seed categories
insert into public.categories (name, slug, description, sort_order) values
  ('General Discussion', 'general-discussion', 'Anything freediving related', 1),
  ('Training & Technique', 'training-technique', 'Improve your skills', 2),
  ('Gear & Equipment', 'gear-equipment', 'Fins, wetsuits, computers, and more', 3),
  ('Spots & Travel', 'spots-travel', 'Where to dive around the world', 4),
  ('Beginner Questions', 'beginner-questions', 'New to freediving? Ask here', 5);

-- Enable realtime on posts and replies
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.replies;
```

**Step 5: Apply migration to remote Supabase**

Run:
```bash
npx supabase db push --linked
```

Or apply via the Supabase SQL Editor in the dashboard if CLI linking isn't configured yet.

**Step 6: Enable Google OAuth in Supabase**

In Supabase dashboard: Authentication > Providers > Google. Enable it and add your Google OAuth client ID and secret (from Google Cloud Console).

**Step 7: Commit**

```bash
git add supabase/ .env.local.example
git commit -m "feat: add Supabase schema with RLS policies and seed categories"
```

---

## Task 3: Supabase Client Setup

**Files:**
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Create: `src/lib/types/database.ts`

**Step 1: Install dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Step 2: Generate TypeScript types from Supabase**

Run:
```bash
npx supabase gen types typescript --linked > src/lib/types/database.ts
```

If CLI isn't linked, run:
```bash
npx supabase gen types typescript --project-id your-project-ref > src/lib/types/database.ts
```

**Step 3: Create server-side Supabase client**

Create: `src/lib/supabase/server.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/lib/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

**Step 4: Create browser-side Supabase client**

Create: `src/lib/supabase/client.ts`

```ts
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 5: Create middleware helper**

Create: `src/lib/supabase/middleware.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  await supabase.auth.getUser();

  return supabaseResponse;
}
```

**Step 6: Create Next.js middleware**

Create: `src/middleware.ts`

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Step 7: Verify the dev server still runs**

Run:
```bash
npm run dev
```

Expected: No errors. Page still loads at http://localhost:3000.

**Step 8: Commit**

```bash
git add src/lib/ src/middleware.ts
git commit -m "feat: configure Supabase client for server, browser, and middleware"
```

---

## Task 4: Auth — Signup, Login, and Callback

**Files:**
- Create: `src/app/auth/signup/page.tsx`
- Create: `src/app/auth/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/auth/actions.ts`

**Step 1: Create auth server actions**

Create: `src/app/auth/actions.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    const { error: profileError } = await supabase
      .from("users")
      .insert({ id: data.user.id, username });

    if (profileError) {
      redirect(`/auth/signup?error=${encodeURIComponent(profileError.message)}`);
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function loginWithMagicLink(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/login?message=Check your email for the magic link");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
```

**Step 2: Create OAuth callback handler**

Create: `src/app/auth/callback/route.ts`

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user profile exists, create if not (for OAuth users)
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (!existing) {
        const username =
          data.user.user_metadata?.full_name?.replace(/\s+/g, "").toLowerCase() ||
          `user_${data.user.id.slice(0, 8)}`;

        await supabase.from("users").insert({
          id: data.user.id,
          username,
          avatar_url: data.user.user_metadata?.avatar_url || null,
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate`);
}
```

**Step 3: Create signup page**

Create: `src/app/auth/signup/page.tsx`

```tsx
import { signup } from "../actions";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="mt-1 text-sm text-gray-500">Join the freediving community</p>
        </div>

        {searchParams.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {searchParams.error}
          </div>
        )}

        <form action={signup} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign Up
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
```

**Step 4: Create login page**

Create: `src/app/auth/login/page.tsx`

```tsx
import { login, loginWithMagicLink } from "../actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Log In</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back</p>
        </div>

        {searchParams.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {searchParams.error}
          </div>
        )}
        {searchParams.message && (
          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
            {searchParams.message}
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Log In
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">or</span>
          </div>
        </div>

        <form action={loginWithMagicLink}>
          <input
            name="email"
            type="email"
            placeholder="Email for magic link"
            required
            className="mb-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Send Magic Link
          </button>
        </form>

        <a
          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/callback`}
          className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Continue with Google
        </a>

        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <a href="/auth/signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
```

**Step 5: Verify auth pages render**

Run:
```bash
npm run dev
```

Visit http://localhost:3000/auth/login and http://localhost:3000/auth/signup. Both should render forms.

**Step 6: Commit**

```bash
git add src/app/auth/
git commit -m "feat: add signup, login, magic link, and OAuth callback"
```

---

## Task 5: Shared Layout — Navbar and Footer

**Files:**
- Create: `src/components/navbar.tsx`
- Create: `src/components/footer.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Step 1: Set up Tailwind base styles**

Modify: `src/app/globals.css` — replace contents with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-white text-gray-900 antialiased;
  }
}
```

**Step 2: Create Navbar component**

Create: `src/components/navbar.tsx`

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/auth/actions";

const categories = [
  { name: "General", slug: "general-discussion" },
  { name: "Training", slug: "training-technique" },
  { name: "Gear", slug: "gear-equipment" },
  { name: "Spots", slug: "spots-travel" },
  { name: "Beginners", slug: "beginner-questions" },
];

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("username")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-blue-600">
            Freediving Forum
          </Link>
          <div className="hidden items-center gap-4 md:flex">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/c/${cat.slug}`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && profile ? (
            <>
              <Link
                href="/new"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                New Post
              </Link>
              <Link
                href={`/profile/${profile.username}`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {profile.username}
              </Link>
              <form action={signout}>
                <button
                  type="submit"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
```

**Step 3: Create Footer component**

Create: `src/components/footer.tsx`

```tsx
export default function Footer() {
  return (
    <footer className="border-t border-gray-200 py-6">
      <div className="mx-auto max-w-4xl px-4 text-center text-sm text-gray-400">
        Freediving Forum — Built for the community
      </div>
    </footer>
  );
}
```

**Step 4: Update root layout to include Navbar and Footer**

Modify: `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Freediving Forum",
  description: "The community for freedivers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <Navbar />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

**Step 5: Verify layout renders**

Run:
```bash
npm run dev
```

Expected: Navbar shows at top with "Freediving Forum" brand, category links, login/signup buttons. Footer at bottom.

**Step 6: Commit**

```bash
git add src/components/ src/app/layout.tsx src/app/globals.css
git commit -m "feat: add shared navbar and footer layout"
```

---

## Task 6: Home Feed — Post Listing

**Files:**
- Create: `src/components/post-card.tsx`
- Create: `src/lib/categories.ts`
- Modify: `src/app/page.tsx`

**Step 1: Create category config with colors**

Create: `src/lib/categories.ts`

```ts
export const CATEGORIES = [
  { name: "General Discussion", slug: "general-discussion", color: "bg-gray-100 text-gray-700" },
  { name: "Training & Technique", slug: "training-technique", color: "bg-blue-100 text-blue-700" },
  { name: "Gear & Equipment", slug: "gear-equipment", color: "bg-green-100 text-green-700" },
  { name: "Spots & Travel", slug: "spots-travel", color: "bg-orange-100 text-orange-700" },
  { name: "Beginner Questions", slug: "beginner-questions", color: "bg-purple-100 text-purple-700" },
] as const;

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
```

**Step 2: Create PostCard component**

Create: `src/components/post-card.tsx`

```tsx
import Link from "next/link";
import { getCategoryBySlug } from "@/lib/categories";

interface PostCardProps {
  id: string;
  title: string;
  authorUsername: string;
  categorySlug: string;
  categoryName: string;
  replyCount: number;
  createdAt: string;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function PostCard({
  id,
  title,
  authorUsername,
  categorySlug,
  categoryName,
  replyCount,
  createdAt,
}: PostCardProps) {
  const category = getCategoryBySlug(categorySlug);
  const colorClass = category?.color ?? "bg-gray-100 text-gray-700";

  return (
    <Link
      href={`/post/${id}`}
      className="block rounded-lg border border-gray-200 p-4 transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-gray-900">
            {title}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
              {categoryName}
            </span>
            <span>{authorUsername}</span>
            <span>·</span>
            <span>{timeAgo(createdAt)}</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-sm text-gray-400">
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </div>
      </div>
    </Link>
  );
}
```

**Step 3: Build the home page with category filter and sort**

Modify: `src/app/page.tsx`

```tsx
import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post-card";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default async function Home({
  searchParams,
}: {
  searchParams: { category?: string; sort?: string };
}) {
  const supabase = await createClient();
  const activeCategory = searchParams.category;
  const sort = searchParams.sort || "latest";

  let query = supabase
    .from("posts")
    .select(`
      id,
      title,
      reply_count,
      created_at,
      users!author_id ( username ),
      categories!category_id ( name, slug )
    `);

  if (activeCategory) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", activeCategory)
      .single();
    if (cat) {
      query = query.eq("category_id", cat.id);
    }
  }

  if (sort === "replies") {
    query = query.order("reply_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(50);

  const { data: posts } = await query;

  return (
    <div className="space-y-6">
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/"
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            !activeCategory
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </Link>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/?category=${cat.slug}`}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              activeCategory === cat.slug
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.name.split(" ")[0]}
          </Link>
        ))}
      </div>

      {/* Sort options */}
      <div className="flex gap-3 text-sm">
        <Link
          href={`/?${activeCategory ? `category=${activeCategory}&` : ""}sort=latest`}
          className={sort === "latest" ? "font-semibold text-gray-900" : "text-gray-500 hover:text-gray-700"}
        >
          Latest
        </Link>
        <Link
          href={`/?${activeCategory ? `category=${activeCategory}&` : ""}sort=replies`}
          className={sort === "replies" ? "font-semibold text-gray-900" : "text-gray-500 hover:text-gray-700"}
        >
          Most Replies
        </Link>
      </div>

      {/* Post list */}
      <div className="space-y-3">
        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              authorUsername={post.users?.username ?? "unknown"}
              categorySlug={post.categories?.slug ?? ""}
              categoryName={post.categories?.name ?? ""}
              replyCount={post.reply_count}
              createdAt={post.created_at}
            />
          ))
        ) : (
          <p className="py-12 text-center text-gray-400">
            No posts yet. Be the first to start a discussion!
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Verify home page renders**

Run:
```bash
npm run dev
```

Expected: Home page shows category filter pills, sort options, and "No posts yet" message (empty database).

**Step 5: Commit**

```bash
git add src/app/page.tsx src/components/post-card.tsx src/lib/categories.ts
git commit -m "feat: add home feed with category filters and sort options"
```

---

## Task 7: Category Page

**Files:**
- Create: `src/app/c/[category]/page.tsx`

**Step 1: Create category page**

Create: `src/app/c/[category]/page.tsx`

```tsx
import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post-card";
import { getCategoryBySlug } from "@/lib/categories";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: { category: string };
  searchParams: { sort?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = getCategoryBySlug(params.category);
  if (!category) return { title: "Not Found" };
  return { title: `${category.name} — Freediving Forum` };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const sort = searchParams.sort || "latest";

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", params.category)
    .single();

  if (!category) notFound();

  let query = supabase
    .from("posts")
    .select(`
      id,
      title,
      reply_count,
      created_at,
      users!author_id ( username ),
      categories!category_id ( name, slug )
    `)
    .eq("category_id", category.id);

  if (sort === "replies") {
    query = query.order("reply_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(50);

  const { data: posts } = await query;

  const categoryMeta = getCategoryBySlug(params.category);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{category.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{category.description}</p>
      </div>

      <div className="flex gap-3 text-sm">
        <a
          href={`/c/${params.category}?sort=latest`}
          className={sort === "latest" ? "font-semibold text-gray-900" : "text-gray-500 hover:text-gray-700"}
        >
          Latest
        </a>
        <a
          href={`/c/${params.category}?sort=replies`}
          className={sort === "replies" ? "font-semibold text-gray-900" : "text-gray-500 hover:text-gray-700"}
        >
          Most Replies
        </a>
      </div>

      <div className="space-y-3">
        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              authorUsername={post.users?.username ?? "unknown"}
              categorySlug={post.categories?.slug ?? ""}
              categoryName={post.categories?.name ?? ""}
              replyCount={post.reply_count}
              createdAt={post.created_at}
            />
          ))
        ) : (
          <p className="py-12 text-center text-gray-400">
            No posts in this category yet.
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify category page renders**

Run:
```bash
npm run dev
```

Visit http://localhost:3000/c/general-discussion — should show category header and empty state.

**Step 3: Commit**

```bash
git add src/app/c/
git commit -m "feat: add category page with post listing"
```

---

## Task 8: Create Post Page

**Files:**
- Create: `src/app/new/page.tsx`
- Create: `src/app/new/actions.ts`

**Step 1: Create post server action**

Create: `src/app/new/actions.ts`

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createPost(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const categoryId = formData.get("category_id") as string;

  if (!title?.trim() || !body?.trim() || !categoryId) {
    redirect("/new?error=All fields are required");
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      title: title.trim(),
      body: body.trim(),
      category_id: categoryId,
      author_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/post/${post.id}`);
}
```

**Step 2: Create new post page**

Create: `src/app/new/page.tsx`

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createPost } from "./actions";

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New Post</h1>

      {searchParams.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <form action={createPost} className="space-y-4">
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            id="category_id"
            name="category_id"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a category</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700">
            Content (Markdown supported)
          </label>
          <textarea
            id="body"
            name="body"
            required
            rows={10}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Publish Post
        </button>
      </form>
    </div>
  );
}
```

**Step 3: Verify create post page renders**

Run:
```bash
npm run dev
```

Visit http://localhost:3000/new — should redirect to login if not authenticated. If logged in, should show the form.

**Step 4: Commit**

```bash
git add src/app/new/
git commit -m "feat: add create post page with server action"
```

---

## Task 9: Single Post Page with Replies

**Files:**
- Create: `src/app/post/[id]/page.tsx`
- Create: `src/app/post/[id]/actions.ts`
- Create: `src/components/reply-list.tsx`
- Create: `src/components/reply-form.tsx`
- Create: `src/components/markdown-body.tsx`

**Step 1: Install markdown dependencies**

Run:
```bash
npm install react-markdown rehype-sanitize
```

**Step 2: Create markdown renderer component**

Create: `src/components/markdown-body.tsx`

```tsx
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export default function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-800">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

**Step 3: Install Tailwind Typography plugin**

Run:
```bash
npm install @tailwindcss/typography
```

Modify: `tailwind.config.ts` — add the plugin:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
```

**Step 4: Create reply server action**

Create: `src/app/post/[id]/actions.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createReply(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const body = formData.get("body") as string;
  const postId = formData.get("post_id") as string;

  if (!body?.trim()) return;

  const { error } = await supabase.from("replies").insert({
    body: body.trim(),
    post_id: postId,
    author_id: user.id,
  });

  if (error) return;

  revalidatePath(`/post/${postId}`);
}
```

**Step 5: Create reply form (client component)**

Create: `src/components/reply-form.tsx`

```tsx
"use client";

import { useRef } from "react";
import { createReply } from "@/app/post/[id]/actions";

export default function ReplyForm({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await createReply(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <input type="hidden" name="post_id" value={postId} />
      <textarea
        name="body"
        required
        rows={4}
        placeholder="Write a reply (Markdown supported)..."
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Reply
      </button>
    </form>
  );
}
```

**Step 6: Create reply list component**

Create: `src/components/reply-list.tsx`

```tsx
import MarkdownBody from "./markdown-body";

interface Reply {
  id: string;
  body: string;
  created_at: string;
  users: { username: string; avatar_url: string | null } | null;
}

export default function ReplyList({ replies }: { replies: Reply[] }) {
  return (
    <div className="space-y-4">
      {replies.map((reply) => (
        <div key={reply.id} className="rounded-lg border border-gray-200 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-gray-700">
              {reply.users?.username ?? "unknown"}
            </span>
            <span>·</span>
            <span>
              {new Date(reply.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <MarkdownBody content={reply.body} />
        </div>
      ))}
    </div>
  );
}
```

**Step 7: Create single post page**

Create: `src/app/post/[id]/page.tsx`

```tsx
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/categories";
import MarkdownBody from "@/components/markdown-body";
import ReplyList from "@/components/reply-list";
import ReplyForm from "@/components/reply-form";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title")
    .eq("id", params.id)
    .single();
  return { title: post ? `${post.title} — Freediving Forum` : "Not Found" };
}

export default async function PostPage({ params }: Props) {
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(`
      *,
      users!author_id ( username, avatar_url ),
      categories!category_id ( name, slug )
    `)
    .eq("id", params.id)
    .single();

  if (!post) notFound();

  const { data: replies } = await supabase
    .from("replies")
    .select(`
      id,
      body,
      created_at,
      users!author_id ( username, avatar_url )
    `)
    .eq("post_id", params.id)
    .order("created_at", { ascending: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const category = getCategoryBySlug(post.categories?.slug ?? "");
  const colorClass = category?.color ?? "bg-gray-100 text-gray-700";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Post header */}
      <div>
        <Link
          href={`/c/${post.categories?.slug}`}
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
        >
          {post.categories?.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{post.title}</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
          <Link
            href={`/profile/${post.users?.username}`}
            className="font-medium text-gray-700 hover:underline"
          >
            {post.users?.username}
          </Link>
          <span>·</span>
          <span>
            {new Date(post.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Post body */}
      <MarkdownBody content={post.body} />

      {/* Replies */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          {post.reply_count} {post.reply_count === 1 ? "Reply" : "Replies"}
        </h2>

        {replies && replies.length > 0 && (
          <ReplyList replies={replies as any} />
        )}

        {user ? (
          <ReplyForm postId={params.id} />
        ) : (
          <p className="text-sm text-gray-500">
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Log in
            </Link>{" "}
            to reply.
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 8: Verify post page renders**

Run:
```bash
npm run dev
```

Visit http://localhost:3000/post/nonexistent — should 404. Create a post through the UI and verify the full post + replies flow works.

**Step 9: Commit**

```bash
git add src/app/post/ src/components/markdown-body.tsx src/components/reply-list.tsx src/components/reply-form.tsx tailwind.config.ts
git commit -m "feat: add single post page with markdown rendering and replies"
```

---

## Task 10: User Profile Page

**Files:**
- Create: `src/app/profile/[username]/page.tsx`

**Step 1: Create profile page**

Create: `src/app/profile/[username]/page.tsx`

```tsx
import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post-card";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: { username: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `${params.username} — Freediving Forum` };
}

export default async function ProfilePage({ params }: Props) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("username", params.username)
    .single();

  if (!profile) notFound();

  const { data: posts } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      reply_count,
      created_at,
      users!author_id ( username ),
      categories!category_id ( name, slug )
    `)
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {profile.avatar_url && (
          <img
            src={profile.avatar_url}
            alt={profile.username}
            className="h-16 w-16 rounded-full"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile.username}</h1>
          {profile.bio && (
            <p className="mt-1 text-sm text-gray-500">{profile.bio}</p>
          )}
          <p className="text-xs text-gray-400">
            Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Posts</h2>
        <div className="space-y-3">
          {posts && posts.length > 0 ? (
            posts.map((post: any) => (
              <PostCard
                key={post.id}
                id={post.id}
                title={post.title}
                authorUsername={post.users?.username ?? "unknown"}
                categorySlug={post.categories?.slug ?? ""}
                categoryName={post.categories?.name ?? ""}
                replyCount={post.reply_count}
                createdAt={post.created_at}
              />
            ))
          ) : (
            <p className="text-sm text-gray-400">No posts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify profile page renders**

Run:
```bash
npm run dev
```

Expected: Visit `/profile/someuser` — shows 404 if user doesn't exist, shows profile if they do.

**Step 3: Commit**

```bash
git add src/app/profile/
git commit -m "feat: add user profile page with post listing"
```

---

## Task 11: Realtime Updates

**Files:**
- Create: `src/components/realtime-posts.tsx`
- Create: `src/components/realtime-replies.tsx`

**Step 1: Create realtime post subscription (client component)**

Create: `src/components/realtime-posts.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RealtimePosts() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("public:posts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return null;
}
```

**Step 2: Create realtime reply subscription (client component)**

Create: `src/components/realtime-replies.tsx`

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RealtimeReplies({ postId }: { postId: string }) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`public:replies:post_id=eq.${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "replies",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router, postId]);

  return null;
}
```

**Step 3: Add RealtimePosts to home page**

Modify: `src/app/page.tsx` — add at top of the returned JSX (inside the outer `<div>`):

```tsx
import RealtimePosts from "@/components/realtime-posts";

// Inside the component's return, add as first child:
<RealtimePosts />
```

**Step 4: Add RealtimePosts to category page**

Modify: `src/app/c/[category]/page.tsx` — same pattern, add `<RealtimePosts />` inside the outer `<div>`.

**Step 5: Add RealtimeReplies to post page**

Modify: `src/app/post/[id]/page.tsx` — add before the replies section:

```tsx
import RealtimeReplies from "@/components/realtime-replies";

// Inside the component's return, add before the replies div:
<RealtimeReplies postId={params.id} />
```

**Step 6: Verify realtime works**

Open two browser tabs. Create a post in one — it should appear in the other without manual refresh.

**Step 7: Commit**

```bash
git add src/components/realtime-posts.tsx src/components/realtime-replies.tsx src/app/page.tsx src/app/c/ src/app/post/
git commit -m "feat: add realtime subscriptions for posts and replies"
```

---

## Task 12: Report & Moderation

**Files:**
- Create: `src/components/report-button.tsx`
- Create: `src/app/post/[id]/report-action.ts`
- Create: `src/components/delete-button.tsx`
- Create: `src/app/post/[id]/delete-action.ts`

**Step 1: Create report server action**

Create: `src/app/post/[id]/report-action.ts`

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function reportContent(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const postId = formData.get("post_id") as string | null;
  const replyId = formData.get("reply_id") as string | null;
  const reason = formData.get("reason") as string;

  if (!reason?.trim()) return;

  await supabase.from("reports").insert({
    reporter_id: user.id,
    post_id: postId || null,
    reply_id: replyId || null,
    reason: reason.trim(),
  });
}
```

**Step 2: Create report button (client component)**

Create: `src/components/report-button.tsx`

```tsx
"use client";

import { useState } from "react";
import { reportContent } from "@/app/post/[id]/report-action";

interface ReportButtonProps {
  postId?: string;
  replyId?: string;
}

export default function ReportButton({ postId, replyId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <span className="text-xs text-gray-400">Reported</span>;
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-gray-400 hover:text-red-500"
      >
        Report
      </button>
      {open && (
        <form
          action={async (formData) => {
            await reportContent(formData);
            setSubmitted(true);
            setOpen(false);
          }}
          className="mt-2 flex gap-2"
        >
          {postId && <input type="hidden" name="post_id" value={postId} />}
          {replyId && <input type="hidden" name="reply_id" value={replyId} />}
          <input
            name="reason"
            required
            placeholder="Reason for report"
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <button
            type="submit"
            className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
          >
            Submit
          </button>
        </form>
      )}
    </>
  );
}
```

**Step 3: Create delete server action**

Create: `src/app/post/[id]/delete-action.ts`

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function deletePost(formData: FormData) {
  const supabase = await createClient();
  const postId = formData.get("post_id") as string;

  const { error } = await supabase.from("posts").delete().eq("id", postId);

  if (!error) {
    redirect("/");
  }
}

export async function deleteReply(formData: FormData) {
  const supabase = await createClient();
  const replyId = formData.get("reply_id") as string;
  const postId = formData.get("post_id") as string;

  await supabase.from("replies").delete().eq("id", replyId);

  revalidatePath(`/post/${postId}`);
}
```

**Step 4: Create delete button (client component)**

Create: `src/components/delete-button.tsx`

```tsx
"use client";

import { deletePost, deleteReply } from "@/app/post/[id]/delete-action";

interface DeleteButtonProps {
  postId?: string;
  replyId?: string;
  parentPostId?: string;
}

export default function DeleteButton({
  postId,
  replyId,
  parentPostId,
}: DeleteButtonProps) {
  const action = postId ? deletePost : deleteReply;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Are you sure you want to delete this?")) {
          e.preventDefault();
        }
      }}
    >
      {postId && <input type="hidden" name="post_id" value={postId} />}
      {replyId && (
        <>
          <input type="hidden" name="reply_id" value={replyId} />
          <input type="hidden" name="post_id" value={parentPostId} />
        </>
      )}
      <button type="submit" className="text-xs text-red-500 hover:text-red-700">
        Delete
      </button>
    </form>
  );
}
```

**Step 5: Integrate report and delete buttons into post page**

Modify: `src/app/post/[id]/page.tsx` — add report button to post and replies, delete buttons for authors/admins. Fetch user's admin status and pass it through.

After the post body `<MarkdownBody>`, add:

```tsx
import ReportButton from "@/components/report-button";
import DeleteButton from "@/components/delete-button";

// After MarkdownBody, before replies section:
<div className="flex gap-3">
  {user && <ReportButton postId={params.id} />}
  {user && (user.id === post.author_id || isAdmin) && (
    <DeleteButton postId={params.id} />
  )}
</div>
```

Add admin check after getting user:

```tsx
let isAdmin = false;
if (user) {
  const { data: currentUser } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  isAdmin = currentUser?.is_admin ?? false;
}
```

Add report and delete to each reply in the `ReplyList` component — pass `userId` and `isAdmin` props, or add inline.

**Step 6: Verify moderation features**

Test: report a post, verify it appears in the reports table. Log in as admin, verify delete works.

**Step 7: Commit**

```bash
git add src/components/report-button.tsx src/components/delete-button.tsx src/app/post/
git commit -m "feat: add report and delete functionality for moderation"
```

---

## Task 13: Search

**Files:**
- Modify: `src/components/navbar.tsx`
- Create: `src/app/search/page.tsx`

**Step 1: Add search form to navbar**

Modify: `src/components/navbar.tsx` — add a search input that navigates to `/search?q=...`:

Add between the category links and the auth buttons:

```tsx
<form action="/search" method="get" className="hidden md:block">
  <input
    name="q"
    type="search"
    placeholder="Search..."
    className="w-40 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
  />
</form>
```

**Step 2: Create search results page**

Create: `src/app/search/page.tsx`

```tsx
import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post-card";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q?.trim();

  if (!query) {
    return (
      <div className="py-12 text-center text-gray-400">
        Enter a search term to find posts.
      </div>
    );
  }

  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      reply_count,
      created_at,
      users!author_id ( username ),
      categories!category_id ( name, slug )
    `)
    .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">
        Results for &ldquo;{query}&rdquo;
      </h1>

      <div className="space-y-3">
        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <PostCard
              key={post.id}
              id={post.id}
              title={post.title}
              authorUsername={post.users?.username ?? "unknown"}
              categorySlug={post.categories?.slug ?? ""}
              categoryName={post.categories?.name ?? ""}
              replyCount={post.reply_count}
              createdAt={post.created_at}
            />
          ))
        ) : (
          <p className="py-12 text-center text-gray-400">
            No posts found matching your search.
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Verify search works**

Create a post, then search for words in its title or body.

**Step 4: Commit**

```bash
git add src/components/navbar.tsx src/app/search/
git commit -m "feat: add search functionality"
```

---

## Task 14: Mobile Navigation

**Files:**
- Create: `src/components/mobile-nav.tsx`
- Modify: `src/components/navbar.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create mobile nav (client component)**

Create: `src/components/mobile-nav.tsx`

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";

const categories = [
  { name: "General Discussion", slug: "general-discussion" },
  { name: "Training & Technique", slug: "training-technique" },
  { name: "Gear & Equipment", slug: "gear-equipment" },
  { name: "Spots & Travel", slug: "spots-travel" },
  { name: "Beginner Questions", slug: "beginner-questions" },
];

export default function MobileNav({
  user,
}: {
  user: { username: string } | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-gray-600"
        aria-label="Toggle menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full border-b border-gray-200 bg-white px-4 py-3">
          <form action="/search" method="get" className="mb-3">
            <input
              name="q"
              type="search"
              placeholder="Search posts..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </form>
          <div className="space-y-2">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/c/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="block text-sm text-gray-600 hover:text-gray-900"
              >
                {cat.name}
              </Link>
            ))}
          </div>
          <div className="mt-3 border-t border-gray-100 pt-3">
            {user ? (
              <Link
                href={`/profile/${user.username}`}
                onClick={() => setOpen(false)}
                className="block text-sm text-gray-600"
              >
                Profile ({user.username})
              </Link>
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="text-sm text-gray-600"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setOpen(false)}
                  className="text-sm text-blue-600"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Integrate MobileNav into Navbar**

Modify: `src/components/navbar.tsx` — import and add `<MobileNav user={profile} />` before the desktop nav section. Pass the profile to it.

**Step 3: Add sticky mobile bottom bar for "New Post"**

Add to `src/app/layout.tsx` — after `<Footer />`:

For logged-in users only — this can be a small client component, or conditionally rendered in the layout.

A simpler approach: in the Navbar, add a fixed mobile bottom button for "New Post" when user is authenticated.

**Step 4: Verify mobile navigation**

Resize browser to mobile width. Hamburger menu should appear. Verify all links work, search works.

**Step 5: Commit**

```bash
git add src/components/mobile-nav.tsx src/components/navbar.tsx src/app/layout.tsx
git commit -m "feat: add mobile navigation with hamburger menu"
```

---

## Task 15: Final Polish and Build Verification

**Files:**
- Modify: various files for cleanup

**Step 1: Run TypeScript check**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors. Fix any type errors that appear.

**Step 2: Run ESLint**

Run:
```bash
npm run lint
```

Expected: No errors. Fix any lint issues.

**Step 3: Run production build**

Run:
```bash
npm run build
```

Expected: Build completes successfully with no errors.

**Step 4: Test production build locally**

Run:
```bash
npm start
```

Visit http://localhost:3000. Verify all pages render and core flows work (browse, login, create post, reply, search).

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix build errors and polish"
```

---

## Task 16: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md with development commands**

Now that the project has code, update CLAUDE.md to include:

```markdown
## Commands

- `npm run dev` — Start dev server (http://localhost:3000)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — TypeScript type check
- `npx supabase gen types typescript --linked > src/lib/types/database.ts` — Regenerate DB types

## Project Structure

- `src/app/` — Next.js App Router pages and server actions
- `src/components/` — Shared React components (server and client)
- `src/lib/supabase/` — Supabase client initialization (server.ts, client.ts, middleware.ts)
- `src/lib/types/` — Generated TypeScript types from Supabase
- `src/lib/categories.ts` — Category config with color mappings
- `supabase/migrations/` — SQL migration files
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with dev commands and project structure"
```
