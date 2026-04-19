import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase is not configured. Copy .env.local.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  _client = createClient(url, anon);
  return _client;
}

export type Item = {
  id: string;
  title: string;
  image_url: string | null;
  size: string;
  price: number;
  condition: string;
  location: string;
  contact: string;
  is_sold: boolean;
  created_at: string;
};

export const BUCKET = "item-images";
