# Mickhail's Wall

A 2008-style wall built with React, Next.js (App Router) and Supabase, for the SUpost hiring test (Test 2).

Live: https://mickhail-wall.vercel.app

## What it does
- Type a message and press **Share**. It is saved in Supabase (`posts` table).
- The feed shows every post, newest first, and they are still there after a refresh.
- Bonus: 280-character limit (counter in the box, plus a database check), live feed with Supabase Realtime, and photo upload to Supabase Storage (images only, 5 MB max).
- No login. You can type a name; it is remembered on your device.

## Security
Row level security is on. Visitors can only read posts and add new ones; nobody can edit or delete through the API. The anon key in the app is public by design.

## Run it
1. Create a Supabase project and run `supabase-setup.sql` in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill in your project URL and anon key.
3. `npm install` then `npm run dev`.
