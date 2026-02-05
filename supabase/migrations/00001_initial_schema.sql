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
