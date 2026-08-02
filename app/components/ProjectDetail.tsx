"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Project, ProjectItem, ProjectStatus,
  Item, calcProjectItem, calcProjectSummary,
  fEur, fKrwFull, discountedPrice,
} from "@/lib/supabase";

// ── 유틸 ─────────────────────────────────────────────────
const fPct = (v: number) => v.toFixed(1) + "%";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "draft",     label: "작업중" },
  { value: "confirmed", label: "확정" },
  { value: "completed", label: "완료" },
];

// 작은 인라인 인풋
function InlineInput({
  label, value, onChange, type = "text", suffix, className = ""
}: {
  label: string; value: string | number;
  onChange: (v: string) => void;
  type?: string; suffix?: string; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <label className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-black w-full"
        />
        {suffix && <span className="text-xs text-gray-400 flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────
interface ProjectDetailProps {
  project: Project | null;          // null = 신규 생성 모드
  items: Item[];                    // 상품 카탈로그
  onSave: (p: Partial<Project>) => Promise<void>;
  onClose: () => void;
}

// ── 신규 ProjectItem 생성 ─────────────────────────────────
// price_eur = 할인가 (= 정가 × (1 - 할인율%))
function makeProjectItem(item: Item, baseMargin: number): ProjectItem {
  return {
    itemId: item.id,
    qty: 1,
    price_eur: discountedPrice(item.price_eur, item.discount ?? 0), // 할인가
    supply_cost_rate: 20,
    sell_margin: baseMargin,
    domestic_retail: 0,   // 국내 소비자가 (KRW, 직접 입력) — 0이면 미입력
    snap: item,
  };
}

// ────────────────────────────────────────────────────────────
export default function ProjectDetail({ project, items, onSave, onClose }: ProjectDetailProps) {
  // ── 기본 정보 state ────────────────────────────────────
  const [title,        setTitle]        = useState("");
  const [client,       setClient]       = useState("");
  const [projectDate,  setProjectDate]  = useState(new Date().toISOString().slice(0, 10));
  const [exchangeRate, setExchangeRate] = useState(1700);
  const [vatRate,      setVatRate]      = useState(10);
  const [baseMargin,   setBaseMargin]   = useState(30);
  const [status,       setStatus]       = useState<ProjectStatus>("draft");
  const [notes,        setNotes]        = useState("");

  // ── 품목 state ────────────────────────────────────────
  const [projItems, setProjItems] = useState<ProjectItem[]>([]);

  // ── 품목 검색 state ───────────────────────────────────
  const [itemSearch, setItemSearch] = useState("");
  const [showItemPicker, setShowItemPicker] = useState(false);

  // ── 저장 중 ───────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  // ── 초기화 ────────────────────────────────────────────
  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setClient(project.client);
      setProjectDate(project.project_date);
      setExchangeRate(project.exchange_rate);
      setVatRate(project.vat_rate);
      setBaseMargin(project.base_margin);
      setStatus(project.status);
      setNotes(project.notes);
      setProjItems(project.items);
    } else {
      setTitle(""); setClient("");
      setProjectDate(new Date().toISOString().slice(0, 10));
      setExchangeRate(1700); setVatRate(10); setBaseMargin(30);
      setStatus("draft"); setNotes(""); setProjItems([]);
    }
  }, [project]);

  // ── 품목 CRUD ─────────────────────────────────────────
  const addItem = (item: Item) => {
    const exists = projItems.find(pi => pi.itemId === item.id);
    if (exists) {
      setProjItems(prev => prev.map(pi =>
        pi.itemId === item.id ? { ...pi, qty: pi.qty + 1 } : pi
      ));
    } else {
      setProjItems(prev => [...prev, makeProjectItem(item, baseMargin)]);
    }
    setShowItemPicker(false);
    setItemSearch("");
  };

  const removeItem = (itemId: string) => {
    setProjItems(prev => prev.filter(pi => pi.itemId !== itemId));
  };

  const updateItem = useCallback((itemId: string, field: keyof ProjectItem, raw: string) => {
    const num = parseFloat(raw);
    setProjItems(prev => prev.map(pi =>
      pi.itemId === itemId
        ? { ...pi, [field]: isNaN(num) ? raw : num }
        : pi
    ));
  }, []);

  // ── 저장 ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { alert("프로젝트명을 입력하세요"); return; }
    setSaving(true);
    await onSave({
      ...(project?.id ? { id: project.id } : {}),
      title: title.trim(),
      client: client.trim(),
      project_date: projectDate,
      exchange_rate: exchangeRate,
      vat_rate: vatRate,
      base_margin: baseMargin,
      status,
      notes,
      items: projItems,
    });
    setSaving(false);
  };

  // ── 계산 — domesticVatRate 전달 ─────────────────────────────────
  const summary = calcProjectSummary(projItems, exchangeRate, vatRate);

  // ── 기본 마진율 일괄적용 ───────────────────────────────
  const applyBaseMarginToAll = () => {
    setProjItems(prev => prev.map(pi => ({ ...pi, sell_margin: baseMargin })));
  };
  const hasCustomMargin = projItems.some(pi => pi.sell_margin !== baseMargin);

  // ── 필터링된 카탈로그 ─────────────────────────────────
  const filteredItems = itemSearch.trim()
    ? items.filter(i => {
        const q = itemSearch.toLowerCase();
        return i.brand.toLowerCase().includes(q) ||
               i.model.toLowerCase().includes(q) ||
               (i.code ?? "").toLowerCase().includes(q);
      })
    : items;

  // ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── 상단 헤더 바 ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2 className="text-sm font-bold text-gray-800">
            {project ? "프로젝트 편집" : "새 프로젝트"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={e => setStatus(e.target.value as ProjectStatus)}
            className={`text-xs px-2 py-1 rounded border font-medium focus:outline-none ${
              status === "completed" ? "border-green-300 text-green-700 bg-green-50" :
              status === "confirmed" ? "border-blue-300 text-blue-700 bg-blue-50" :
              "border-yellow-300 text-yellow-700 bg-yellow-50"
            }`}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-black text-white text-xs font-semibold rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* ── 스크롤 영역 ── */}
      <div className="flex-1 overflow-auto pb-24">

        {/* ━━━━ 구역 1: 프로젝트 기본 정보 ━━━━ */}
        <section className="px-4 py-4 border-b border-gray-100">
          <h3 className="text-[11px] font-extrabold text-gray-400 tracking-widest uppercase mb-3">
            01 · 프로젝트 기본 정보
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <InlineInput label="프로젝트명" value={title} onChange={setTitle} className="col-span-2 sm:col-span-2" />
            <InlineInput label="고객명" value={client} onChange={setClient} />
            <InlineInput label="견적일" value={projectDate} onChange={setProjectDate} type="date" />
            <InlineInput label="환율 (KRW/EUR)" value={exchangeRate} onChange={v => setExchangeRate(parseFloat(v) || 1700)} type="number" suffix="₩" />
            <InlineInput label="국내 부가세 (수입 시)" value={vatRate} onChange={v => setVatRate(parseFloat(v) || 10)} type="number" suffix="%" />
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">기본 마진율</label>
              <div className="flex items-center gap-1">
                <input
                  type="number" value={baseMargin}
                  onChange={e => setBaseMargin(parseFloat(e.target.value) || 30)}
                  className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-black w-full"
                />
                <span className="text-xs text-gray-400 flex-shrink-0">%</span>
                {hasCustomMargin && (
                  <button
                    type="button"
                    onClick={applyBaseMarginToAll}
                    title="모든 품목에 기본 마진율 일괄적용"
                    className="flex-shrink-0 px-1.5 py-1 text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                    일괄
                  </button>
                )}
              </div>
              {hasCustomMargin && (
                <p className="text-[9px] text-orange-400">품목별 개별 설정 있음</p>
              )}
            </div>
          </div>
          {/* 메모 */}
          <div className="mt-3">
            <label className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">메모</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="내부 메모..."
              className="mt-0.5 w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-black resize-none"
            />
          </div>
        </section>

        {/* ━━━━ 구역 2: 품목 리스트 ━━━━ */}
        <section className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-extrabold text-gray-400 tracking-widest uppercase">
              02 · 품목 리스트
              {projItems.length > 0 && (
                <span className="ml-2 text-gray-300 font-normal">{projItems.length}종</span>
              )}
            </h3>
            <button
              onClick={() => setShowItemPicker(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-black text-white text-xs font-medium rounded hover:bg-gray-800 transition-colors"
            >
              <span>+</span> 품목 추가
            </button>
          </div>

          {/* 품목 검색 팝업 */}
          {showItemPicker && (
            <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden shadow-lg">
              <div className="bg-gray-50 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder="브랜드, 모델, 코드 검색..."
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                />
                <button onClick={() => { setShowItemPicker(false); setItemSearch(""); }}
                  className="text-gray-400 hover:text-gray-600 text-xs px-1">✕</button>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                {filteredItems.slice(0, 30).map(item => (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-semibold text-gray-800">
                        {item.brand} · {item.model}
                      </div>
                      <div className="text-[10px] text-gray-400">{item.finish} {item.dims}</div>
                    </div>
                    <div className="text-xs font-bold text-gray-700 flex-shrink-0 text-right">
                        <div>{fEur(discountedPrice(item.price_eur, item.discount ?? 0))}</div>
                        {(item.discount ?? 0) > 0 && (
                          <div className="text-[10px] text-gray-400 line-through">{fEur(item.price_eur)}</div>
                        )}
                      </div>
                  </button>
                ))}
                {filteredItems.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-gray-400">검색 결과 없음</div>
                )}
              </div>
            </div>
          )}

          {/* 품목 테이블 */}
          {projItems.length > 0 ? (
            <div className="overflow-x-auto -mx-4">
              <table className="w-full text-xs border-collapse" style={{ minWidth: "900px" }}>
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <th className="text-left px-4 py-2 font-semibold text-gray-500 w-[200px]">품목</th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-500 w-12">수량</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-32">유럽 공급가<br/><span className="font-normal text-gray-400">할인가 · EUR</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">환산 원가<br/><span className="font-normal text-gray-400">× 환율</span></th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-500 w-16">부대비율<br/><span className="font-normal text-gray-400">%</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">부대비<br/><span className="font-normal text-gray-400">KRW</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">총 원가<br/><span className="font-normal text-gray-400">KRW</span></th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-500 w-16">마진율<br/><span className="font-normal text-gray-400">%</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">고객판매단가<br/><span className="font-normal text-gray-400">단가 KRW</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">합계<br/><span className="font-normal text-gray-400">단가×수량 KRW</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">국내 소비자가<br/><span className="font-normal text-gray-400">KRW 직접입력</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">공식 소비자가<br/><span className="font-normal text-gray-400">EUR×1.22 → KRW</span></th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-500 w-16">할인율<br/><span className="font-normal text-gray-400">%</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">이익금액<br/><span className="font-normal text-gray-400">KRW</span></th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projItems.map((pi) => {
                    const c = calcProjectItem(pi, exchangeRate, vatRate); // vatRate = 국내 부가세 (기본 10%)
                    return (
                      <tr key={pi.itemId} className="hover:bg-gray-50 transition-colors">
                        {/* 품목명 */}
                        <td className="px-4 py-2.5 align-top">
                          <div className="font-semibold text-gray-800">{pi.snap.brand}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                            {pi.snap.model}
                            {pi.snap.finish && <span className="ml-1">· {pi.snap.finish}</span>}
                          </div>
                        </td>

                        {/* 수량 — -/+ 버튼 */}
                        <td className="px-2 py-2.5 align-middle">
                          <div className="flex items-center gap-1">
                            <button type="button"
                              onClick={() => updateItem(pi.itemId, "qty", String(Math.max(1, pi.qty - 1)))}
                              className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100 transition-colors text-sm font-bold leading-none"
                            >−</button>
                            <span className="w-7 text-center text-xs font-semibold tabular-nums">{pi.qty}</span>
                            <button type="button"
                              onClick={() => updateItem(pi.itemId, "qty", String(pi.qty + 1))}
                              className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100 transition-colors text-sm font-bold leading-none"
                            >+</button>
                          </div>
                        </td>

                        {/* 유럽 공급가 — 정수 표시 + 리테일가 참고 */}
                        <td className="px-2 py-2.5 align-top text-right">
                          {/* 할인가 입력 (EUR) */}
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number" step="1" min="0"
                              value={Math.round(pi.price_eur)}
                              onChange={e => updateItem(pi.itemId, "price_eur", e.target.value)}
                              className="w-20 text-right border border-gray-200 rounded px-1 py-0.5 text-xs font-semibold focus:outline-none focus:border-black"
                            />
                            <span className="text-[10px] text-gray-400">€</span>
                          </div>
                          {/* 리테일가 + 할인율 참고 */}
                          {(pi.snap.discount ?? 0) > 0 && (
                            <div className="text-[10px] text-gray-400 mt-0.5 text-right">
                              리테일가 €{Math.round(pi.snap.price_eur)}
                              <span className="ml-1 text-blue-500">-{pi.snap.discount}%</span>
                            </div>
                          )}
                          {/* 수량 합계 */}
                          {pi.qty > 1 && (
                            <div className="text-[10px] text-gray-400 mt-0.5 text-right">
                              합계 €{Math.round(pi.price_eur * pi.qty).toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* 환산 원가 (자동) */}
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="font-medium text-gray-700">{fKrwFull(c.cost_krw)}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">수량 합계 {fKrwFull(c.cost_krw_total)}</div>
                        </td>

                        {/* 부대비율 (입력 가능) */}
                        <td className="px-2 py-2.5 align-top text-center">
                          <input
                            type="number" min="0" max="100" step="0.5"
                            value={pi.supply_cost_rate}
                            onChange={e => updateItem(pi.itemId, "supply_cost_rate", e.target.value)}
                            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-black"
                          />
                        </td>

                        {/* 부대비 (자동) */}
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="text-gray-700">{fKrwFull(c.supply_cost)}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">수량 합계 {fKrwFull(c.supply_cost_total)}</div>
                        </td>

                        {/* 총 원가 (자동) */}
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="font-semibold text-gray-800">{fKrwFull(c.total_cost)}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">수량 합계 {fKrwFull(c.total_cost_total)}</div>
                        </td>

                        {/* 마진율 (입력 가능) */}
                        <td className="px-2 py-2.5 align-top text-center">
                          <input
                            type="number" min="0" max="99" step="0.5"
                            value={pi.sell_margin}
                            onChange={e => updateItem(pi.itemId, "sell_margin", e.target.value)}
                            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-black"
                          />
                        </td>

                        {/* 고객판매단가 (1개, 자동) */}
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="font-bold text-black">{fKrwFull(c.sell_price)}</div>
                        </td>

                        {/* 합계 (단가×수량, 자동) */}
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="font-semibold text-gray-800">{fKrwFull(c.sell_price_total)}</div>
                          {pi.qty > 1 && (
                            <div className="text-[10px] text-gray-400 mt-0.5">{pi.qty}개 × {fKrwFull(c.sell_price)}</div>
                          )}
                        </td>

                        {/* 국내 소비자가 (KRW 직접 입력) */}
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number" step="1000" min="0"
                              value={pi.domestic_retail || ""}
                              placeholder="0"
                              onChange={e => updateItem(pi.itemId, "domestic_retail", e.target.value)}
                              className="w-24 text-right border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-black"
                            />
                            <span className="text-[10px] text-gray-400">₩</span>
                          </div>
                          {pi.domestic_retail > 0 && (
                            <div className="text-[10px] text-gray-400 mt-0.5 text-right">
                              {fKrwFull(pi.domestic_retail)}
                            </div>
                          )}
                        </td>

                        {/* 공식 소비자가 (EUR×1.22→KRW, 자동) */}
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="text-gray-700 font-medium">{fKrwFull(c.retail_krw)}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">리테일 €{Math.round(pi.snap.price_eur).toLocaleString()} × 1.22</div>
                          {pi.qty > 1 && (
                            <div className="text-[10px] text-gray-400 mt-0.5">합계 {fKrwFull(c.retail_krw_total)}</div>
                          )}
                        </td>

                        {/* 할인율 (국내 소비자가 대비, 자동) */}
                        <td className="px-2 py-2.5 align-top text-center">
                          {pi.domestic_retail > 0 ? (
                            <span className={`font-semibold ${c.discount_rate >= 0 ? "text-blue-600" : "text-red-500"}`}>
                              {fPct(c.discount_rate)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* 이익금액 (자동) */}
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className={`font-semibold ${c.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {fKrwFull(c.profit)}
                          </div>
                          <div className={`text-[10px] mt-0.5 ${c.profit_total >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                            수량 합계 {fKrwFull(c.profit_total)}
                          </div>
                        </td>

                        {/* 삭제 */}
                        <td className="px-2 py-2.5 align-top">
                          <button
                            onClick={() => removeItem(pi.itemId)}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-300 border-2 border-dashed border-gray-200 rounded-lg">
              품목을 추가하면 여기에 표시됩니다
            </div>
          )}
        </section>

        {/* ━━━━ 구역 3: 비용 요약 ━━━━ */}
        {projItems.length > 0 && (
          <section className="px-4 py-4 border-b border-gray-100">
            <h3 className="text-[11px] font-extrabold text-gray-400 tracking-widest uppercase mb-3">
              03 · 비용 요약
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 유럽 총액 */}
              <SummaryCard
                label="유럽 총액"
                value={fEur(summary.total_eur)}
                sub="EUR 기준"
              />
              {/* 총 원가 */}
              <SummaryCard
                label="총 원가"
                value={fKrwFull(summary.total_cost_krw)}
                sub={`부대비 ${fKrwFull(summary.total_supply)} 포함`}
              />
              {/* 총 고객 판매가 */}
              <SummaryCard
                label="총 고객 판매가"
                value={fKrwFull(summary.total_sell)}
                highlight
              />
              {/* 총 공식 소비자가 */}
              <SummaryCard
                label="총 공식 소비자가"
                value={summary.total_retail > 0 ? fKrwFull(summary.total_retail) : "—"}
                sub="입력된 항목 기준"
              />
              {/* 총 이익금액 */}
              <SummaryCard
                label="총 이익금액"
                value={fKrwFull(summary.total_profit)}
                sub=""
                accent={summary.total_profit >= 0 ? "green" : "red"}
              />
              {/* 평균 마진율 */}
              <SummaryCard
                label="평균 마진율"
                value={fPct(summary.avg_margin)}
                sub="판매가 기준"
                accent={summary.avg_margin >= 20 ? "green" : "red"}
              />
              {/* 총 부대비 */}
              <SummaryCard
                label="총 부대비"
                value={fKrwFull(summary.total_supply)}
                sub="수입 부대비용"
              />
              {/* 총 품목 수 */}
              <SummaryCard
                label="총 품목 수"
                value={`${summary.item_count}개`}
                sub={`${projItems.length}종`}
              />
            </div>
          </section>
        )}

        {/* ━━━━ 구역 4: 고객 견적 전환 액션 ━━━━ */}
        <section className="px-4 py-4">
          <h3 className="text-[11px] font-extrabold text-gray-400 tracking-widest uppercase mb-3">
            04 · 고객 견적 전환
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-xs rounded-lg cursor-not-allowed"
              title="추후 구현 예정"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              고객 견적서로 변환
              <span className="text-[9px] bg-gray-100 px-1 rounded">준비중</span>
            </button>
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-xs rounded-lg cursor-not-allowed"
              title="추후 구현 예정"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              내부 원가표 출력
              <span className="text-[9px] bg-gray-100 px-1 rounded">준비중</span>
            </button>
          </div>
          <p className="mt-2 text-[10px] text-gray-300">프로젝트 저장 후 고객 견적서 탭에서 별도 견적 생성 가능</p>
        </section>

      </div>
    </div>
  );
}

// ── 요약 카드 컴포넌트 ─────────────────────────────────
function SummaryCard({
  label, value, sub, highlight, accent
}: {
  label: string; value: string; sub?: string;
  highlight?: boolean; accent?: "green" | "red";
}) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${
      highlight ? "border-black bg-black text-white" : "border-gray-200 bg-white"
    }`}>
      <div className={`text-[10px] font-medium mb-1 ${highlight ? "text-white/60" : "text-gray-400"}`}>
        {label}
      </div>
      <div className={`text-sm font-bold leading-tight ${
        highlight ? "text-white" :
        accent === "green" ? "text-emerald-600" :
        accent === "red" ? "text-red-500" :
        "text-gray-900"
      }`}>
        {value}
      </div>
      {sub && (
        <div className={`text-[9px] mt-0.5 ${highlight ? "text-white/50" : "text-gray-400"}`}>{sub}</div>
      )}
    </div>
  );
}
