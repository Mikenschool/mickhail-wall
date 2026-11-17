import { createClient } from "@supabase/supabase-js";

// The anon key is public by design; row level security in Supabase
// only allows reading posts and adding new ones (no edits or deletes).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const BUCKET = "wall-photos";
export const MAX_CHARS = 280;
