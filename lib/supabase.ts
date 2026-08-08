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
 * supply_cost_rate — 호환성 유지용으로 남겨두되 계산에서 제외
 * 실제 부대비용은 Project 레벨의 cost_* 필드로 관리
 */
export type ProjectItem = {
  itemId: string;
  qty: number;
  price_eur: number;          // 유럽 공급가 (EUR, 할인가 기준)
  supply_cost_rate: number;   // (레거시) 품목별 부대비율 — UI에서 숨김
  sell_margin: number;        // 마진율 (%)
  domestic_retail: number;    // 국내 소비자가 (KRW, 직접 입력)
  snap: Item;
};

export type ProjectStatus = "draft" | "confirmed" | "completed";

/**
 * ProjectCosts: 프로젝트 레벨 부대비용 6항목
 *
 * cost_local_logistics   이태리 현지 물류비 (PICK UP / B/L / STUFFING 등 합계, KRW)
 * cost_freight           해상운임/항공운임 (OCEAN TICKET 등 합계, KRW)
 * cost_domestic_customs  국내 부대비용 (THC/DOC/관세/수입부가세 등 합계, KRW)
 * cost_domestic_delivery 국내 물류비용 (TRUCKING CHARGE 등, KRW)
 * cost_installation      시공비 (기본 300,000원, KRW)
 * cost_other             기타/보험료 (KRW)
 */
export type ProjectCosts = {
  cost_local_logistics:   number;
  cost_freight:           number;
  cost_domestic_customs:  number;
  cost_domestic_delivery: number;
  cost_installation:      number;
  cost_other:             number;
};

export type Project = {
  id: string;
  title: string;
  client: string;
  project_date: string;
  exchange_rate: number;
  vat_rate: number;         // (레거시) 유지
  base_margin: number;      // 기본 마진율 (%)
  status: ProjectStatus;
  notes: string;
  items: ProjectItem[];
  // 부대비용 6항목
  cost_local_logistics:   number;
  cost_freight:           number;
  cost_domestic_customs:  number;
  cost_domestic_delivery: number;
  cost_installation:      number;
  cost_other:             number;
  // 회계용 날짜
  confirmed_at:  string | null;  // 계약일 (= 수금완료일)
  delivered_at:  string | null;  // 납품완료일
  created_at: string;
  updated_at: string;
};

// ── Project Costs 합계 ────────────────────────────────
/**
 * 부대비용 6항목 합계 (KRW)
 */
export function calcTotalAdditionalCosts(costs: ProjectCosts): number {
  return (
    (costs.cost_local_logistics   || 0) +
    (costs.cost_freight           || 0) +
    (costs.cost_domestic_customs  || 0) +
    (costs.cost_domestic_delivery || 0) +
    (costs.cost_installation      || 0) +
    (costs.cost_other             || 0)
  );
}

// ── Project Calculation Helpers ────────────────────────
/**
 * 품목 1행 계산
 *
 * 변경사항:
 * - supply_cost, supply_cost_rate → 0으로 고정 (부대비는 프로젝트 레벨에서 관리)
 * - sell_price = total_cost / (1 - margin%) 는 유지
 *   단, total_cost = cost_krw (제품원가만)
 *   → 판매가는 프로젝트 요약에서 부대비 배분 후 재계산
 */
export type ProjectItemCalc = {
  cost_krw: number;           // 제품 환산 원가 (1개)
  cost_krw_total: number;     // 제품 환산 원가 (수량 합계)
  supply_cost: number;        // 레거시 유지 (0)
  supply_cost_total: number;  // 레거시 유지 (0)
  total_cost: number;         // 제품 원가 (= cost_krw, 1개)
  total_cost_total: number;   // 제품 원가 합계 (× qty)
  domestic_vat: number;       // 레거시 유지 (0)
  domestic_vat_total: number;
  sell_price: number;         // 참고용 단품 판매가 (부대비 미포함)
  sell_price_total: number;   // 참고용 합계 판매가
  retail_eur: number;         // 이탈리아 공식 소비자가 EUR
  retail_krw: number;
  retail_krw_total: number;
  discount_rate: number;      // 국내 소비자가 대비 할인율
  profit: number;             // 참고용 이익 (부대비 미포함)
  profit_total: number;
};

export function calcProjectItem(
  item: ProjectItem,
  exchangeRate: number,
  _vatRate = 10,  // 레거시 파라미터 유지
): ProjectItemCalc {
  const cost_krw        = item.price_eur * exchangeRate;
  const total_cost      = cost_krw;  // 부대비는 프로젝트 레벨
  const sell_price      = item.sell_margin >= 100
    ? total_cost
    : total_cost / (1 - item.sell_margin / 100);
  const sell_price_total = sell_price * item.qty;
  const retail_eur      = item.snap.price_eur * 1.22;
  const retail_krw      = retail_eur * exchangeRate;
  const domestic_retail = item.domestic_retail ?? 0;
  const discount_rate   = domestic_retail > 0
    ? (1 - sell_price / domestic_retail) * 100
    : 0;
  const profit = sell_price - total_cost;

  return {
    cost_krw,
    cost_krw_total:       cost_krw * item.qty,
    supply_cost:          0,
    supply_cost_total:    0,
    total_cost,
    total_cost_total:     total_cost * item.qty,
    domestic_vat:         0,
    domestic_vat_total:   0,
    sell_price,
    sell_price_total,
    retail_eur,
    retail_krw,
    retail_krw_total:     retail_krw * item.qty,
    discount_rate,
    profit,
    profit_total:         profit * item.qty,
  };
}

/**
 * 프로젝트 전체 요약 계산
 *
 * 핵심 계산식:
 *   제품 원가 합계     = Σ(price_eur × qty) × exchange_rate
 *   부대비용 합계      = cost_local_logistics + cost_freight + ... (6항목)
 *   실제 총원가        = 제품 원가 + 부대비용
 *   판매가             = 실제 총원가 ÷ (1 - base_margin%)
 *   수익               = 판매가 - 실제 총원가
 *   수익률             = base_margin%
 */
export type ProjectSummary = {
  // 제품 원가
  total_eur:              number;  // 유럽 공급가 합계 (EUR)
  total_product_krw:      number;  // 제품 원가 합계 (KRW)
  // 부대비용
  cost_local_logistics:   number;
  cost_freight:           number;
  cost_domestic_customs:  number;
  cost_domestic_delivery: number;
  cost_installation:      number;
  cost_other:             number;
  total_additional_costs: number;  // 부대비용 합계
  // 총합
  total_cost_krw:         number;  // 실제 총원가 (제품+부대비)
  total_sell:             number;  // 판매가 (총원가 ÷ (1-마진율))
  total_profit:           number;  // 수익
  avg_margin:             number;  // 마진율 (%)
  // 기타
  total_retail:           number;  // 공식 소비자가 합계
  item_count:             number;  // 수량 합계
  // 레거시 (하위 호환)
  total_supply:           number;  // 0
};

export function calcProjectSummary(
  items: ProjectItem[],
  exchangeRate: number,
  _vatRate = 10,
  costs?: Partial<ProjectCosts>,
  baseMargin = 30,
): ProjectSummary {
  let total_eur = 0, total_product_krw = 0;
  let total_retail = 0, item_count = 0;

  for (const item of items) {
    total_eur         += item.price_eur * item.qty;
    total_product_krw += item.price_eur * item.qty * exchangeRate;
    total_retail      += item.snap.price_eur * 1.22 * exchangeRate * item.qty;
    item_count        += item.qty;
  }

  const c = costs || {};
  const cost_local_logistics   = c.cost_local_logistics   || 0;
  const cost_freight           = c.cost_freight           || 0;
  const cost_domestic_customs  = c.cost_domestic_customs  || 0;
  const cost_domestic_delivery = c.cost_domestic_delivery || 0;
  const cost_installation      = c.cost_installation      ?? 300000;
  const cost_other             = c.cost_other             || 0;

  const total_additional_costs =
    cost_local_logistics + cost_freight + cost_domestic_customs +
    cost_domestic_delivery + cost_installation + cost_other;

  const total_cost_krw = total_product_krw + total_additional_costs;

  // 판매가 = 총원가 ÷ (1 - 마진율%)
  const margin = Math.min(baseMargin, 99.9);
  const total_sell = margin >= 100 ? total_cost_krw : total_cost_krw / (1 - margin / 100);
  const total_profit = total_sell - total_cost_krw;
  const avg_margin = total_sell > 0 ? (total_profit / total_sell) * 100 : 0;

  return {
    total_eur,
    total_product_krw,
    cost_local_logistics,
    cost_freight,
    cost_domestic_customs,
    cost_domestic_delivery,
    cost_installation,
    cost_other,
    total_additional_costs,
    total_cost_krw,
    total_sell,
    total_profit,
    avg_margin,
    total_retail,
    item_count,
    total_supply: 0,  // 레거시
  };
}

// ── KRW 포맷 ──────────────────────────────────────────
export const fKrwFull = (v: number) =>
  "₩ " + Math.round(v).toLocaleString("ko-KR");
