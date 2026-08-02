import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Types ──────────────────────────────────────────────
export type Item = {
  id: string;
  brand: string;
  category: string;
  model: string;
  code: string;
  dims: string;
  finish: string;
  price_eur: number;
  discount: number;
  notes: string;
  img: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteItem = {
  itemId: string;
  qty: number;
  discount: number;
  snap: Item;
};

export type Quote = {
  id: string;
  title: string;
  client: string;
  quote_date: string;
  currency: "BOTH" | "EUR" | "KRW";
  exchange_rate: number;
  items: QuoteItem[];
  created_at: string;
  updated_at: string;
};

// ── Helpers ────────────────────────────────────────────
export const fEur = (v: number) =>
  "€ " + v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fKrw = (v: number, rate = 1700) =>
  "₩ " + Math.round(v * rate).toLocaleString("ko-KR");

export const discountedPrice = (price: number, disc: number) =>
  price * (1 - disc / 100);
