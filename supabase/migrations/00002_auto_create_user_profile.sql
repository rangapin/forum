-- Automatically create a public.users row when a new auth user is created.
-- Runs as security definer to bypass RLS.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      'user_' || left(new.id::text, 8)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
