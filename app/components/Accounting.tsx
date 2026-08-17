"use client";

import { useState, useMemo } from "react";
import {
  Project, ProjectCosts,
  calcProjectSummary, fKrwFull,
} from "@/lib/supabase";

// ── 유틸 ──────────────────────────────────────────────────
const fPct = (v: number) => v.toFixed(1) + "%";
const fDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

// 프로젝트 한 건의 회계 집계
type ProjectAccounting = {
  id: string;
  title: string;
  client: string;
  status: string;
  project_date: string;
  confirmed_at: string | null;
  delivered_at: string | null;
  // 원가
  total_eur: number;
  total_product_krw: number;
  total_additional_costs: number;
  total_cost_krw: number;
  // 수익
  total_sell: number;
  total_profit: number;
  avg_margin: number;
  // 부대비 상세
  cost_local_logistics: number;
  cost_freight: number;
  cost_domestic_customs: number;
  cost_domestic_delivery: number;
  cost_installation: number;
  cost_other: number;
  // 품목 수
  item_count: number;
};

function buildAccounting(projects: Project[]): ProjectAccounting[] {
  return projects.map(p => {
    const costs: Partial<ProjectCosts> = {
      cost_local_logistics:   p.cost_local_logistics   ?? 0,
      cost_freight:           p.cost_freight           ?? 0,
      cost_domestic_customs:  p.cost_domestic_customs  ?? 0,
      cost_domestic_delivery: p.cost_domestic_delivery ?? 0,
      cost_installation:      p.cost_installation      ?? 300000,
      cost_other:             p.cost_other             ?? 0,
    };
    const summary = calcProjectSummary(
      p.items || [],
      p.exchange_rate ?? 1700,
      p.vat_rate ?? 10,
      costs,
      p.base_margin ?? 30,
    );
    return {
      id: p.id,
      title: p.title,
      client: p.client,
      status: p.status,
      project_date: p.project_date,
      confirmed_at: p.confirmed_at ?? null,
      delivered_at: p.delivered_at ?? null,
      total_eur:               summary.total_eur,
      total_product_krw:       summary.total_product_krw,
      total_additional_costs:  summary.total_additional_costs,
      total_cost_krw:          summary.total_cost_krw,
      total_sell:              summary.total_sell,
      total_profit:            summary.total_profit,
      avg_margin:              summary.avg_margin,
      cost_local_logistics:    summary.cost_local_logistics,
      cost_freight:            summary.cost_freight,
      cost_domestic_customs:   summary.cost_domestic_customs,
      cost_domestic_delivery:  summary.cost_domestic_delivery,
      cost_installation:       summary.cost_installation,
      cost_other:              summary.cost_other,
      item_count:              summary.item_count,
    };
  });
}

// ── 기간 필터 옵션 ────────────────────────────────────────
type PeriodFilter = "all" | "this_month" | "last_month" | "this_year" | "custom";
type StatusFilter = "all" | "draft" | "confirmed" | "completed";

function inPeriod(dateStr: string | null | undefined, from: Date | null, to: Date | null): boolean {
  if (!from && !to) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (from && d < from) return false;
  if (to   && d > to)   return false;
  return true;
}

// ── 요약 카드 ─────────────────────────────────────────────
function KpiCard({
  label, value, sub, color = "gray", icon,
}: {
  label: string; value: string; sub?: string;
  color?: "gray" | "green" | "red" | "blue" | "amber";
  icon?: React.ReactNode;
}) {
  const colorMap = {
    gray:  "border-gray-200 bg-white",
    green: "border-emerald-200 bg-emerald-50",
    red:   "border-red-200   bg-red-50",
    blue:  "border-blue-200  bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
  };
  const valueColor = {
    gray:  "text-gray-900",
    green: "text-emerald-700",
    red:   "text-red-600",
    blue:  "text-blue-700",
    amber: "text-amber-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">{label}</span>
        {icon && <span className="text-gray-300">{icon}</span>}
      </div>
      <div className={`text-lg font-extrabold leading-tight ${valueColor[color]}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── 상태 배지 ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft:     { label: "작업중", className: "bg-yellow-100 text-yellow-700" },
    confirmed: { label: "확정",   className: "bg-blue-100 text-blue-700" },
    completed: { label: "완료",   className: "bg-green-100 text-green-700" },
  };
  const s = map[status] ?? { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${s.className}`}>
      {s.label}
    </span>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────
interface AccountingProps {
  projects: Project[];
}

export default function Accounting({ projects }: AccountingProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [customFrom,   setCustomFrom]   = useState("");
  const [customTo,     setCustomTo]     = useState("");
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [sortBy,       setSortBy]       = useState<"project_date" | "total_sell" | "total_profit" | "avg_margin">("project_date");
  const [sortAsc,      setSortAsc]      = useState(false);

  // 기간 범위 계산
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    if (periodFilter === "this_month") {
      return {
        fromDate: new Date(now.getFullYear(), now.getMonth(), 1),
        toDate:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    }
    if (periodFilter === "last_month") {
      return {
        fromDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        toDate:   new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
    }
    if (periodFilter === "this_year") {
      return {
        fromDate: new Date(now.getFullYear(), 0, 1),
        toDate:   new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };
    }
    if (periodFilter === "custom") {
      return {
        fromDate: customFrom ? new Date(customFrom) : null,
        toDate:   customTo   ? new Date(customTo + "T23:59:59") : null,
      };
    }
    return { fromDate: null, toDate: null };
  }, [periodFilter, customFrom, customTo]);

  // 전체 집계
  const allAccounting = useMemo(() => buildAccounting(projects), [projects]);

  // 필터 적용
  const filtered = useMemo(() => {
    let list = allAccounting;

    // 상태 필터
    if (statusFilter !== "all") {
      list = list.filter(a => a.status === statusFilter);
    }

    // 기간 필터 — project_date 기준
    list = list.filter(a => inPeriod(a.project_date, fromDate, toDate));

    // 정렬
    list = [...list].sort((a, b) => {
      let diff = 0;
      if (sortBy === "project_date") {
        diff = (a.project_date ?? "").localeCompare(b.project_date ?? "");
      } else {
        diff = a[sortBy] - b[sortBy];
      }
      return sortAsc ? diff : -diff;
    });

    return list;
  }, [allAccounting, statusFilter, fromDate, toDate, sortBy, sortAsc]);

  // KPI 합계
  const kpi = useMemo(() => {
    const totalSell    = filtered.reduce((s, a) => s + a.total_sell,    0);
    const totalCost    = filtered.reduce((s, a) => s + a.total_cost_krw, 0);
    const totalProfit  = filtered.reduce((s, a) => s + a.total_profit,  0);
    const totalAdditional = filtered.reduce((s, a) => s + a.total_additional_costs, 0);
    const avgMargin    = totalSell > 0 ? (totalProfit / totalSell) * 100 : 0;
    const count        = filtered.length;
    const completed    = filtered.filter(a => a.status === "completed").length;
    const confirmed    = filtered.filter(a => a.status === "confirmed").length;
    return { totalSell, totalCost, totalProfit, avgMargin, count, completed, confirmed, totalAdditional };
  }, [filtered]);

  // 정렬 토글
  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortAsc(v => !v);
    else { setSortBy(col); setSortAsc(false); }
  };
  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    <span className="ml-0.5 text-gray-400">
      {sortBy === col ? (sortAsc ? "↑" : "↓") : "↕"}
    </span>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">

      {/* ── 필터 바 ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-wrap gap-2 items-center flex-shrink-0">

        {/* 기간 필터 */}
        <div className="flex items-center gap-1 flex-wrap">
          {(["all","this_month","last_month","this_year","custom"] as PeriodFilter[]).map(p => {
            const label: Record<PeriodFilter, string> = {
              all:        "전체",
              this_month: "이번달",
              last_month: "지난달",
              this_year:  "올해",
              custom:     "직접설정",
            };
            return (
              <button
                key={p}
                onClick={() => setPeriodFilter(p)}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  periodFilter === p
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {label[p]}
              </button>
            );
          })}
        </div>

        {/* 커스텀 날짜 */}
        {periodFilter === "custom" && (
          <div className="flex items-center gap-1 text-xs">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-black" />
            <span className="text-gray-400">~</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-black" />
          </div>
        )}

        {/* 상태 필터 */}
        <div className="flex items-center gap-1 ml-auto">
          {(["all","draft","confirmed","completed"] as StatusFilter[]).map(s => {
            const label: Record<StatusFilter, string> = {
              all: "전체상태", draft: "작업중", confirmed: "확정", completed: "완료",
            };
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {label[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 스크롤 영역 ── */}
      <div className="flex-1 overflow-auto pb-16">

        {/* ── KPI 카드 ── */}
        <div className="px-4 pt-4 pb-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="총 고객 판매가"
            value={fKrwFull(kpi.totalSell)}
            sub={`${kpi.count}건 합계`}
            color="blue"
          />
          <KpiCard
            label="실제 총원가"
            value={fKrwFull(kpi.totalCost)}
            sub="제품+부대비 합계"
            color="gray"
          />
          <KpiCard
            label="총 수익"
            value={fKrwFull(kpi.totalProfit)}
            sub="판매가 − 총원가"
            color={kpi.totalProfit >= 0 ? "green" : "red"}
          />
          <KpiCard
            label="평균 마진율"
            value={fPct(kpi.avgMargin)}
            sub="수익 / 판매가"
            color={kpi.avgMargin >= 20 ? "green" : "red"}
          />
          <KpiCard
            label="부대비 합계"
            value={fKrwFull(kpi.totalAdditional)}
            sub="6항목 총합"
            color="amber"
          />
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-1">프로젝트 현황</div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">전체</span>
                <span className="font-bold text-gray-800">{kpi.count}건</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-500">확정</span>
                <span className="font-bold text-blue-700">{kpi.confirmed}건</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-500">완료</span>
                <span className="font-bold text-emerald-700">{kpi.completed}건</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 수익성 테이블 ── */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

            {/* 테이블 헤더 */}
            <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">
                프로젝트별 수익성
              </span>
              <span className="text-[10px] text-gray-400">{filtered.length}건</span>
            </div>

            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-300">
                조건에 맞는 프로젝트가 없습니다
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: "900px" }}>
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-500 w-[200px]">프로젝트 / 고객</th>
                      <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-16">상태</th>
                      <th
                        className="text-center px-2 py-2.5 font-semibold text-gray-500 w-24 cursor-pointer hover:text-gray-800"
                        onClick={() => toggleSort("project_date")}
                      >
                        견적일 <SortIcon col="project_date" />
                      </th>
                      <th className="text-right px-2 py-2.5 font-semibold text-gray-500 w-32">제품 원가</th>
                      <th className="text-right px-2 py-2.5 font-semibold text-gray-500 w-28">부대비용</th>
                      <th className="text-right px-2 py-2.5 font-semibold text-gray-500 w-32">실제 총원가</th>
                      <th
                        className="text-right px-2 py-2.5 font-semibold text-gray-500 w-32 cursor-pointer hover:text-gray-800"
                        onClick={() => toggleSort("total_sell")}
                      >
                        판매가 <SortIcon col="total_sell" />
                      </th>
                      <th
                        className="text-right px-2 py-2.5 font-semibold text-gray-500 w-28 cursor-pointer hover:text-gray-800"
                        onClick={() => toggleSort("total_profit")}
                      >
                        수익금액 <SortIcon col="total_profit" />
                      </th>
                      <th
                        className="text-center px-2 py-2.5 font-semibold text-gray-500 w-20 cursor-pointer hover:text-gray-800"
                        onClick={() => toggleSort("avg_margin")}
                      >
                        마진율 <SortIcon col="avg_margin" />
                      </th>
                      <th className="text-center px-2 py-2.5 font-semibold text-gray-500 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(a => (
                      <>
                        <tr
                          key={a.id}
                          onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          {/* 프로젝트명 */}
                          <td className="px-3 py-3 align-top">
                            <div className="font-semibold text-gray-800 leading-tight">{a.title || "—"}</div>
                            {a.client && <div className="text-[10px] text-gray-400 mt-0.5">{a.client}</div>}
                          </td>
                          {/* 상태 */}
                          <td className="px-2 py-3 text-center align-top">
                            <StatusBadge status={a.status} />
                          </td>
                          {/* 견적일 */}
                          <td className="px-2 py-3 text-center align-top text-gray-500">
                            {fDate(a.project_date)}
                          </td>
                          {/* 제품 원가 */}
                          <td className="px-2 py-3 text-right align-top">
                            <div className="text-gray-700 font-medium">{fKrwFull(a.total_product_krw)}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              € {a.total_eur.toLocaleString("de-DE", { maximumFractionDigits: 0 })}
                            </div>
                          </td>
                          {/* 부대비용 */}
                          <td className="px-2 py-3 text-right align-top">
                            <div className="text-gray-600">{fKrwFull(a.total_additional_costs)}</div>
                          </td>
                          {/* 실제 총원가 */}
                          <td className="px-2 py-3 text-right align-top">
                            <div className="font-semibold text-gray-800">{fKrwFull(a.total_cost_krw)}</div>
                          </td>
                          {/* 판매가 */}
                          <td className="px-2 py-3 text-right align-top">
                            <div className="font-bold text-blue-700">{fKrwFull(a.total_sell)}</div>
                          </td>
                          {/* 수익금액 */}
                          <td className="px-2 py-3 text-right align-top">
                            <div className={`font-bold ${a.total_profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {fKrwFull(a.total_profit)}
                            </div>
                          </td>
                          {/* 마진율 */}
                          <td className="px-2 py-3 text-center align-top">
                            <span className={`font-semibold ${a.avg_margin >= 20 ? "text-emerald-600" : "text-red-500"}`}>
                              {fPct(a.avg_margin)}
                            </span>
                          </td>
                          {/* 펼침 토글 */}
                          <td className="px-2 py-3 text-center align-top">
                            <span className="text-gray-300 text-sm">
                              {expandedId === a.id ? "▲" : "▼"}
                            </span>
                          </td>
                        </tr>

                        {/* ── 펼침 상세 행 ── */}
                        {expandedId === a.id && (
                          <tr key={`${a.id}-detail`} className="bg-gray-50/70">
                            <td colSpan={10} className="px-4 py-3">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">

                                {/* 부대비용 상세 */}
                                <div className="col-span-2">
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    부대비용 상세
                                  </div>
                                  <div className="space-y-1.5">
                                    {[
                                      ["① 이태리 현지 물류비", a.cost_local_logistics],
                                      ["② 해상/항공운임",      a.cost_freight],
                                      ["③ 국내 부대비용",      a.cost_domestic_customs],
                                      ["④ 국내 물류비용",      a.cost_domestic_delivery],
                                      ["⑤ 시공비",            a.cost_installation],
                                      ["⑥ 기타/보험료",        a.cost_other],
                                    ].map(([label, val]) => (
                                      <div key={String(label)} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">{label}</span>
                                        <span className={`font-medium tabular-nums ${(val as number) > 0 ? "text-gray-700" : "text-gray-300"}`}>
                                          {(val as number) > 0 ? fKrwFull(val as number) : "—"}
                                        </span>
                                      </div>
                                    ))}
                                    <div className="flex items-center justify-between text-xs border-t border-gray-200 pt-1.5 mt-1">
                                      <span className="font-bold text-gray-700">합계</span>
                                      <span className="font-bold text-gray-800">{fKrwFull(a.total_additional_costs)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 원가 구조 요약 */}
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    원가 구조
                                  </div>
                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between"><span className="text-gray-500">제품 원가</span><span className="font-medium text-gray-700 tabular-nums">{fKrwFull(a.total_product_krw)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">부대비 합계</span><span className="font-medium text-gray-700 tabular-nums">{fKrwFull(a.total_additional_costs)}</span></div>
                                    <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1"><span className="font-bold text-gray-700">실제 총원가</span><span className="font-bold text-gray-800 tabular-nums">{fKrwFull(a.total_cost_krw)}</span></div>
                                    <div className="flex justify-between"><span className="font-bold text-blue-600">고객 판매가</span><span className="font-bold text-blue-700 tabular-nums">{fKrwFull(a.total_sell)}</span></div>
                                    <div className="flex justify-between"><span className={`font-bold ${a.total_profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>수익금액</span><span className={`font-bold tabular-nums ${a.total_profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fKrwFull(a.total_profit)}</span></div>
                                  </div>
                                </div>

                                {/* 회계 날짜 */}
                                <div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    회계 일정
                                  </div>
                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <div className="text-[10px] text-gray-400 mb-0.5">견적일</div>
                                      <div className="font-medium text-gray-700">{fDate(a.project_date)}</div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-gray-400 mb-0.5">계약일 (수금완료)</div>
                                      <div className={`font-medium ${a.confirmed_at ? "text-blue-700" : "text-gray-300"}`}>
                                        {fDate(a.confirmed_at)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-gray-400 mb-0.5">납품완료일</div>
                                      <div className={`font-medium ${a.delivered_at ? "text-emerald-700" : "text-gray-300"}`}>
                                        {fDate(a.delivered_at)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[10px] text-gray-400 mb-0.5">품목 수</div>
                                      <div className="font-medium text-gray-700">{a.item_count}개</div>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>

                  {/* 합계 행 */}
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td colSpan={3} className="px-3 py-2.5 text-xs font-bold text-gray-700">
                        합계 ({filtered.length}건)
                      </td>
                      <td className="px-2 py-2.5 text-right text-xs font-bold text-gray-700 tabular-nums">
                        {fKrwFull(filtered.reduce((s, a) => s + a.total_product_krw, 0))}
                      </td>
                      <td className="px-2 py-2.5 text-right text-xs font-bold text-gray-700 tabular-nums">
                        {fKrwFull(filtered.reduce((s, a) => s + a.total_additional_costs, 0))}
                      </td>
                      <td className="px-2 py-2.5 text-right text-xs font-bold text-gray-700 tabular-nums">
                        {fKrwFull(filtered.reduce((s, a) => s + a.total_cost_krw, 0))}
                      </td>
                      <td className="px-2 py-2.5 text-right text-xs font-bold text-blue-700 tabular-nums">
                        {fKrwFull(kpi.totalSell)}
                      </td>
                      <td className={`px-2 py-2.5 text-right text-xs font-bold tabular-nums ${kpi.totalProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {fKrwFull(kpi.totalProfit)}
                      </td>
                      <td className={`px-2 py-2.5 text-center text-xs font-bold ${kpi.avgMargin >= 20 ? "text-emerald-700" : "text-red-600"}`}>
                        {fPct(kpi.avgMargin)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── 부대비용 항목별 합계 차트 (간단 바 차트) ── */}
        {filtered.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
                <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">
                  부대비용 항목별 합계
                </span>
              </div>
              <div className="px-4 py-4">
                <CostBarChart rows={[
                  { label: "① 이태리 현지 물류비", value: filtered.reduce((s,a)=>s+a.cost_local_logistics,  0) },
                  { label: "② 해상/항공운임",      value: filtered.reduce((s,a)=>s+a.cost_freight,          0) },
                  { label: "③ 국내 부대비용",      value: filtered.reduce((s,a)=>s+a.cost_domestic_customs, 0) },
                  { label: "④ 국내 물류비용",      value: filtered.reduce((s,a)=>s+a.cost_domestic_delivery,0) },
                  { label: "⑤ 시공비",            value: filtered.reduce((s,a)=>s+a.cost_installation,     0) },
                  { label: "⑥ 기타/보험료",        value: filtered.reduce((s,a)=>s+a.cost_other,            0) },
                ]} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── 간단 바 차트 ──────────────────────────────────────────
function CostBarChart({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(...rows.map(r => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="space-y-2.5">
      {rows.map(row => {
        const pct = (row.value / max) * 100;
        const share = total > 0 ? (row.value / total) * 100 : 0;
        return (
          <div key={row.label} className="flex items-center gap-3">
            <div className="w-36 text-xs text-gray-500 flex-shrink-0 text-right">{row.label}</div>
            <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-36 text-xs text-right flex-shrink-0">
              {row.value > 0 ? (
                <>
                  <span className="font-semibold text-gray-700">{fKrwFull(row.value)}</span>
                  <span className="text-gray-400 ml-1">({share.toFixed(1)}%)</span>
                </>
              ) : (
                <span className="text-gray-300">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
