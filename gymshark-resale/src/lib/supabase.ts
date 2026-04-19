import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon);

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
