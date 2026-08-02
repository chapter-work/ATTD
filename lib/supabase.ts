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

// ── Project Types ──────────────────────────────────────
/**
 * ProjectItem: 내부 프로젝트 품목 1행
 *
 * DB 필드명(snake_case) → UI 표시명
 * ──────────────────────────────────────────
 * price_eur         → 유럽 기준가 (EUR)
 * supply_cost_rate  → 부대비율 (%) — 기본 20%
 * retail_eur        → 한국 공식 소비자가 (EUR 기준, 입력)
 * sell_margin       → 마진율 (%) — 품목별 오버라이드 가능
 * qty               → 수량
 * snap              → 품목 스냅샷 (Item)
 */
export type ProjectItem = {
  itemId: string;
  qty: number;
  price_eur: number;        // 유럽 기준가 (EUR) — 스냅샷에서 복사, 수정 가능
  supply_cost_rate: number; // 부대비율 (%) ex) 20
  retail_eur: number;       // 한국 공식 소비자가 (EUR)
  sell_margin: number;      // 마진율 (%)
  snap: Item;               // 품목 스냅샷
};

export type ProjectStatus = "draft" | "confirmed" | "completed";

export type Project = {
  id: string;
  title: string;
  client: string;
  project_date: string;     // ISO date string
  exchange_rate: number;    // 환율 (KRW/EUR)
  vat_rate: number;         // VAT (%) ex) 10
  base_margin: number;      // 기본 마진율 (%) — 품목별 오버라이드 없을 때 사용
  status: ProjectStatus;
  notes: string;
  items: ProjectItem[];
  created_at: string;
  updated_at: string;
};

// ── Project Calculation Helpers ────────────────────────
/**
 * 품목 1행 계산 결과
 *
 * cost_krw       환산 원가          = price_eur × exchange_rate
 * supply_cost    부대비             = cost_krw × supply_cost_rate / 100
 * total_cost     총 원가            = cost_krw + supply_cost
 * sell_price     고객 판매가 (KRW)  = total_cost / (1 - sell_margin/100)
 * retail_krw     한국 공식 소비자가  = retail_eur × exchange_rate
 * discount_rate  공식 소비자가 대비 할인율 (%) = (1 - sell_price/retail_krw) × 100
 * profit         이익금액 (KRW)     = sell_price - total_cost
 */
export type ProjectItemCalc = {
  cost_krw: number;
  supply_cost: number;
  total_cost: number;
  sell_price: number;
  retail_krw: number;
  discount_rate: number;
  profit: number;
  // 수량 반영
  cost_krw_total: number;
  supply_cost_total: number;
  total_cost_total: number;
  sell_price_total: number;
  retail_krw_total: number;
  profit_total: number;
};

export function calcProjectItem(item: ProjectItem, exchangeRate: number): ProjectItemCalc {
  const rate = exchangeRate;
  const cost_krw       = item.price_eur * rate;
  const supply_cost    = cost_krw * (item.supply_cost_rate / 100);
  const total_cost     = cost_krw + supply_cost;
  const sell_price     = item.sell_margin >= 100
    ? total_cost
    : total_cost / (1 - item.sell_margin / 100);
  const retail_krw     = item.retail_eur * rate;
  const discount_rate  = retail_krw > 0
    ? (1 - sell_price / retail_krw) * 100
    : 0;
  const profit         = sell_price - total_cost;

  return {
    cost_krw,
    supply_cost,
    total_cost,
    sell_price,
    retail_krw,
    discount_rate,
    profit,
    cost_krw_total:    cost_krw    * item.qty,
    supply_cost_total: supply_cost * item.qty,
    total_cost_total:  total_cost  * item.qty,
    sell_price_total:  sell_price  * item.qty,
    retail_krw_total:  retail_krw  * item.qty,
    profit_total:      profit      * item.qty,
  };
}

/**
 * 프로젝트 전체 요약 계산
 */
export type ProjectSummary = {
  total_eur:        number; // 유럽 총액 (EUR)
  total_cost_krw:   number; // 총 원가 (KRW)
  total_supply:     number; // 총 부대비 (KRW)
  total_sell:       number; // 총 고객 판매가 (KRW)
  total_retail:     number; // 총 공식 소비자가 (KRW)
  total_profit:     number; // 총 이익금액 (KRW)
  avg_margin:       number; // 평균 마진율 (%)
  item_count:       number; // 총 품목 수 (수량 합산)
};

export function calcProjectSummary(
  items: ProjectItem[],
  exchangeRate: number
): ProjectSummary {
  let total_eur = 0, total_cost_krw = 0, total_supply = 0;
  let total_sell = 0, total_retail = 0, total_profit = 0;
  let item_count = 0;

  for (const item of items) {
    const c = calcProjectItem(item, exchangeRate);
    total_eur        += item.price_eur * item.qty;
    total_cost_krw   += c.total_cost_total;
    total_supply     += c.supply_cost_total;
    total_sell       += c.sell_price_total;
    total_retail     += c.retail_krw_total;
    total_profit     += c.profit_total;
    item_count       += item.qty;
  }

  const avg_margin = total_sell > 0
    ? ((total_sell - total_cost_krw) / total_sell) * 100
    : 0;

  return {
    total_eur,
    total_cost_krw,
    total_supply,
    total_sell,
    total_retail,
    total_profit,
    avg_margin,
    item_count,
  };
}

// ── KRW 포맷 (축약 없음) ──────────────────────────────
export const fKrwFull = (v: number) =>
  "₩ " + Math.round(v).toLocaleString("ko-KR");
