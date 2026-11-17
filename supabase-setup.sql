-- Wall posts table
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Guest' check (char_length(name) between 1 and 40),
  body text not null default '' check (char_length(body) <= 280),
  image_url text,
  created_at timestamptz not null default now(),
  constraint post_not_empty check (char_length(body) > 0 or image_url is not null)
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- Anyone can read and add posts. Nobody can edit or delete through the API.
alter table public.posts enable row level security;
create policy "Anyone can read posts" on public.posts for select to anon, authenticated using (true);
create policy "Anyone can add a post" on public.posts for insert to anon, authenticated with check (true);

-- Live feed (Supabase Realtime)
alter publication supabase_realtime add table public.posts;

-- Photo uploads: public bucket, images only, 5 MB max
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wall-photos', 'wall-photos', true, 5242880, array['image/jpeg','image/png','image/gif','image/webp'])
on conflict (id) do nothing;

create policy "Anyone can upload wall photos" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'wall-photos');
