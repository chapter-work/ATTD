"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Project, ProjectItem, ProjectStatus,
  Item, Quote, QuoteItem,
  calcProjectItem, calcProjectSummary,
  fEur, fKrw, fKrwFull, discountedPrice,
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

// ── 고객 견적서 인쇄 팝업 (SavedQuotes의 openPrintWindow와 동일 양식) ──
const TERMS = [
  "본 견적은 해외 프리미엄 브랜드의 정품 제품을 기준으로 작성되었습니다.",
  "계약은 상품대금 100% 결제 완료 시 성립되며, 계약 완료와 동시에 해외 제조사로 주문이 진행됩니다.",
  "모든 제품은 고객님만을 위해 정식 주문되는 Order Made 상품으로, 해외 발주가 완료된 이후에는 모델, 옵션, 마감, 수량 등의 변경 및 주문 취소가 불가합니다.",
  "예상 납기는 제품 제작 약 10~12주, 해상 운송 약 8~12주가 소요됩니다. 다만 해외 제조사의 생산 일정, 국제 운송 및 통관 절차 등에 따라 변동될 수 있으며, 일정 변경 시 신속히 안내드립니다.",
  "천연 원목, 대리석, 가죽 등 천연 소재는 제품마다 색상, 무늬 및 질감에 자연스러운 차이가 있을 수 있으며, 이는 소재 고유의 특성으로 제품의 하자에 해당하지 않습니다.",
  "설치 완료 후 제품의 외관 및 수량을 확인한 경우 정상 인도된 것으로 간주하며, 제조상의 하자는 해당 브랜드의 품질보증 기준에 따라 처리됩니다.",
  "본 견적의 유효기간은 발행일로부터 10일입니다.",
];

const TERMS_FOOTER = `ATTD는 세계 각국의 프리미엄 리빙 브랜드를 고객의 공간에 연결합니다.

취향과 삶의 방식을 함께 고민하며, 공간과 조화를 이루는 가구·조명·패브릭·오브제를 큐레이션하여 완성도 높은 공간 경험을 제안합니다.

모든 제품은 고객님만을 위해 정식 주문 및 수입되는 프라이빗 오더 상품입니다.`;

function openProjectQuotePrintWindow(
  title: string,
  client: string,
  projectDate: string,
  projItems: ProjectItem[],
  exchangeRate: number,
  vatRate: number,
) {
  /* ── 행 계산 ── */
  const calcs = projItems.map(pi => calcProjectItem(pi, exchangeRate, vatRate));
  const totalKrw = calcs.reduce((s, c) => s + c.sell_price_total, 0);

  /* ── 품목 행 HTML ── */
  const rowsHtml = projItems.map((pi, i) => {
    const c = calcs[i];
    const imgHtml = pi.snap.img
      ? `<img src="${pi.snap.img}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;" />`
      : `<div style="width:36px;height:36px;background:#f0f0f0;border-radius:4px;"></div>`;

    return `
      <tr>
        <td style="padding:10px 6px;vertical-align:top;color:#aaa;font-size:11px;">${i + 1}</td>
        <td style="padding:10px 4px;vertical-align:top;">${imgHtml}</td>
        <td style="padding:10px 8px;vertical-align:top;">
          <div style="font-size:10px;color:#888;font-weight:600;letter-spacing:0.04em;">${pi.snap.brand}</div>
          <div style="font-size:12px;font-weight:700;color:#111;">${pi.snap.model}</div>
        </td>
        <td style="padding:10px 8px;vertical-align:top;font-size:11px;color:#555;max-width:90px;">${pi.snap.finish || ""}</td>
        <td style="padding:10px 6px;vertical-align:top;text-align:right;font-size:12px;white-space:nowrap;">
          <b>${fKrwFull(c.sell_price)}</b>
        </td>
        <td style="padding:10px 6px;vertical-align:top;text-align:center;font-size:12px;font-weight:700;">${pi.qty}</td>
        <td style="padding:10px 6px;vertical-align:top;text-align:right;font-size:12px;white-space:nowrap;">
          <b>${fKrwFull(c.sell_price_total)}</b>
        </td>
      </tr>`;
  }).join("");

  /* ── 합계 HTML ── */
  const totalHtml = `
    <div style="display:flex;align-items:flex-end;gap:8px;">
      <div style="font-size:11px;color:#999;padding-bottom:2px;">합계</div>
      <div style="font-size:13px;font-weight:700;color:#111;">${fKrwFull(totalKrw)}</div>
    </div>`;

  /* ── Terms HTML ── */
  const termsHtml = TERMS.map((t, i) => `
    <li style="display:flex;gap:8px;font-size:10px;color:#666;line-height:1.6;margin-bottom:5px;">
      <span style="font-weight:700;color:#555;flex-shrink:0;">${i + 1}.</span>
      <span>${t}</span>
    </li>`).join("");

  const footerHtml = TERMS_FOOTER.split("\n\n").map(p =>
    `<p style="font-size:10px;color:#666;line-height:1.7;margin:0 0 6px 0;">${p}</p>`
  ).join("");

  /* ── 전체 HTML ── */
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ATTD 견적서 — ${title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body {
      font-family: -apple-system,'Helvetica Neue',Arial,sans-serif;
      color:#111; background:#fff;
      padding:40px 48px; max-width:800px; margin:0 auto;
    }

    .attd-header { padding-top:28px; padding-bottom:22px; border-bottom:2px solid #111; margin-bottom:28px; }
    .attd-brand  { font-size:38px; font-weight:900; letter-spacing:0.18em; color:#111; line-height:1; }
    .attd-sub    { font-size:13px; font-weight:300; letter-spacing:0.08em; color:#666; margin-top:6px; }
    .attd-by     { font-size:11px; letter-spacing:0.06em; color:#aaa; margin-top:3px; }

    .quote-info   { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
    .quote-title  { font-size:18px; font-weight:800; color:#111; }
    .quote-client { font-size:14px; font-weight:700; color:#111; margin-top:4px; }
    .quote-meta   { text-align:right; font-size:12px; color:#888; line-height:1.6; }

    table         { width:100%; border-collapse:collapse; margin-bottom:0; }
    thead tr      { border-top:1.5px solid #111; border-bottom:1.5px solid #111; }
    th            { padding:8px 6px; font-size:11px; font-weight:700; color:#333; }
    th:nth-child(1){ text-align:left; width:28px; }
    th:nth-child(2){ text-align:left; width:44px; }
    th:nth-child(3){ text-align:left; }
    th:nth-child(4){ text-align:left; width:90px; }
    th:nth-child(5){ text-align:right; width:100px; }
    th:nth-child(6){ text-align:center; width:40px; }
    th:nth-child(7){ text-align:right; width:110px; }
    tbody tr      { border-bottom:1px solid #eee; }

    .totals       { display:flex; justify-content:flex-end; gap:32px;
                    border-top:2px solid #111; border-bottom:2px solid #111;
                    padding:10px 0; margin-top:0; margin-bottom:28px; }

    .sign-section { margin-bottom:32px; padding:22px 0 0 0; }
    .sign-row     { display:flex; gap:20px; align-items:flex-end; }
    .sign-box     { flex:0 0 calc(33.33% - 14px); width:calc(33.33% - 14px); }
    .sign-label   { font-size:9px; color:#aaa; margin-bottom:12px;
                    letter-spacing:0.14em; font-weight:600; text-transform:uppercase; }
    .sign-line    { min-height:40px; border-bottom:1.5px solid #111; }

    .tc-section   { padding-top:4px; }
    .tc-title     { font-size:11px; font-weight:800; letter-spacing:0.12em; color:#444;
                    text-transform:uppercase; margin-bottom:10px; }
    .tc-list      { list-style:none; padding:0; }
    .tc-footer    { margin-top:16px; padding-top:14px; border-top:1px solid #eee; }

    .toolbar {
      position:fixed; top:0; left:0; right:0; height:52px;
      background:#111; display:flex; align-items:center;
      justify-content:space-between; padding:0 16px; z-index:999;
    }
    .toolbar-title  { font-size:13px; font-weight:700; color:#fff; letter-spacing:0.12em; }
    .toolbar-actions{ display:flex; gap:8px; align-items:center; }
    .btn-print {
      display:flex; align-items:center; gap:6px;
      background:#fff; color:#111; border:none; border-radius:8px;
      padding:7px 14px; font-size:12px; font-weight:700; cursor:pointer;
    }
    .btn-print:active { background:#e5e5e5; }
    .btn-close {
      display:flex; align-items:center; justify-content:center;
      width:34px; height:34px; background:rgba(255,255,255,0.12);
      color:#fff; border:none; border-radius:50%; font-size:18px; cursor:pointer;
    }
    .btn-close:active { background:rgba(255,255,255,0.25); }
    body { padding-top:72px; }

    @page { size:A4 portrait; margin:14mm 12mm; }
    @media print {
      .toolbar { display:none !important; }
      body { padding:0 48px; }
    }
  </style>
</head>
<body>

  <div class="toolbar">
    <span class="toolbar-title">ATTD 견적서</span>
    <div class="toolbar-actions">
      <button class="btn-print" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        인쇄 / PDF 저장
      </button>
      <button class="btn-close" onclick="window.close()" title="닫기">✕</button>
    </div>
  </div>

  <div class="attd-header">
    <div class="attd-brand">ATTD</div>
    <div class="attd-sub">Private Furniture Curation</div>
    <div class="attd-by">by Chapter Design</div>
  </div>

  <div class="quote-info">
    <div>
      <div class="quote-title">${title || "견적서"}</div>
      ${client ? `<div class="quote-client">${client}</div>` : ""}
    </div>
    <div class="quote-meta">
      ${projectDate ? `<div>${projectDate}</div>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>No.</th>
        <th>사진</th>
        <th>브랜드 / 모델</th>
        <th>피니쉬</th>
        <th style="text-align:right;">단가</th>
        <th style="text-align:center;">수량</th>
        <th style="text-align:right;">합계</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="totals">${totalHtml}</div>

  <div class="sign-section">
    <div class="sign-row">
      <div class="sign-box">
        <div class="sign-label">DATE</div>
        <div class="sign-line"></div>
      </div>
      <div class="sign-box">
        <div class="sign-label">NAME</div>
        <div class="sign-line"></div>
      </div>
      <div class="sign-box">
        <div class="sign-label">SIGNATURE</div>
        <div class="sign-line"></div>
      </div>
    </div>
  </div>

  <div class="tc-section">
    <div class="tc-title">Terms &amp; Conditions</div>
    <ol class="tc-list">${termsHtml}</ol>
    <div class="tc-footer">${footerHtml}</div>
  </div>

</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=1200");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ── Props ─────────────────────────────────────────────────
interface ProjectDetailProps {
  project: Project | null;
  items: Item[];
  onSave: (p: Partial<Project>) => Promise<void>;
  onClose: () => void;
  onCreateQuote?: (quote: Partial<Quote>) => Promise<void>;
}

// ── 신규 ProjectItem 생성 ─────────────────────────────────
function makeProjectItem(item: Item, baseMargin: number): ProjectItem {
  return {
    itemId: item.id,
    qty: 1,
    price_eur: discountedPrice(item.price_eur, item.discount ?? 0),
    supply_cost_rate: 20,
    sell_margin: baseMargin,
    domestic_retail: 0,
    snap: item,
  };
}

// ────────────────────────────────────────────────────────────
export default function ProjectDetail({ project, items, onSave, onClose, onCreateQuote }: ProjectDetailProps) {
  const [title,        setTitle]        = useState("");
  const [client,       setClient]       = useState("");
  const [projectDate,  setProjectDate]  = useState(new Date().toISOString().slice(0, 10));
  const [exchangeRate, setExchangeRate] = useState(1700);
  const [vatRate,      setVatRate]      = useState(10);
  const [baseMargin,   setBaseMargin]   = useState(30);
  const [status,       setStatus]       = useState<ProjectStatus>("draft");
  const [notes,        setNotes]        = useState("");
  const [projItems, setProjItems] = useState<ProjectItem[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingQuote, setCreatingQuote] = useState(false);

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

  const summary = calcProjectSummary(projItems, exchangeRate, vatRate);

  const applyBaseMarginToAll = () => {
    setProjItems(prev => prev.map(pi => ({ ...pi, sell_margin: baseMargin })));
  };
  const hasCustomMargin = projItems.some(pi => pi.sell_margin !== baseMargin);

  const filteredItems = itemSearch.trim()
    ? items.filter(i => {
        const q = itemSearch.toLowerCase();
        return i.brand.toLowerCase().includes(q) ||
               i.model.toLowerCase().includes(q) ||
               (i.code ?? "").toLowerCase().includes(q);
      })
    : items;

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

          {projItems.length > 0 ? (
            <div className="overflow-x-auto -mx-4">
              <table className="w-full text-xs border-collapse" style={{ minWidth: "980px" }}>
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <th className="text-center px-2 py-2 font-semibold text-gray-500 w-8">#</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-500 w-[260px]">품목</th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-500 w-12">수량</th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-32">유럽 공급가<br/><span className="font-normal text-gray-400">VAT22% 제외 · EUR</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">환산 원가<br/><span className="font-normal text-gray-400">× 환율</span></th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-500 w-16">부대비율<br/><span className="font-normal text-gray-400">%</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">부대비<br/><span className="font-normal text-gray-400">KRW</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">총 원가<br/><span className="font-normal text-gray-400">KRW</span></th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-500 w-16">마진율<br/><span className="font-normal text-gray-400">%</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">고객판매가<br/><span className="font-normal text-gray-400">합계 KRW</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">국내 소비자가<br/><span className="font-normal text-gray-400">KRW 직접입력</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">공식 소비자가<br/><span className="font-normal text-gray-400">EUR×1.22 → KRW</span></th>
                    <th className="text-center px-2 py-2 font-semibold text-gray-500 w-16">할인율<br/><span className="font-normal text-gray-400">%</span></th>
                    <th className="text-right px-2 py-2 font-semibold text-gray-500 w-28">이익금액<br/><span className="font-normal text-gray-400">KRW</span></th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projItems.map((pi, idx) => {
                    const c = calcProjectItem(pi, exchangeRate, vatRate);
                    return (
                      <tr key={pi.itemId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2.5 align-top text-center">
                          <span className="text-[11px] font-semibold text-gray-400 tabular-nums">{idx + 1}</span>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 w-12 h-12 rounded border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                              {pi.snap.img ? (
                                <img src={pi.snap.img} alt={pi.snap.model} className="w-full h-full object-cover" />
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                                  <circle cx="8.5" cy="8.5" r="1.5"/>
                                  <polyline points="21 15 16 10 5 21"/>
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-bold text-gray-400 tracking-wide uppercase leading-tight">{pi.snap.brand}</div>
                              <div className="text-xs font-semibold text-gray-800 leading-snug mt-0.5 break-words">{pi.snap.model}</div>
                              {pi.snap.dims && <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{pi.snap.dims}</div>}
                              {pi.snap.finish && <div className="text-[10px] text-gray-400 leading-tight">{pi.snap.finish}</div>}
                            </div>
                          </div>
                        </td>
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
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="text-xs font-semibold text-gray-800">€{(pi.price_eur * pi.qty).toFixed(2)}</div>
                          {pi.qty > 1 && <div className="text-[10px] text-gray-400 mt-0.5">단가 €{pi.price_eur.toFixed(2)}</div>}
                          {(pi.snap.discount ?? 0) > 0 && (
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              리테일 €{pi.snap.price_eur.toFixed(2)}
                              <span className="ml-1 text-blue-500">-{pi.snap.discount}%</span>
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="font-medium text-gray-700">{fKrwFull(c.cost_krw_total)}</div>
                          {pi.qty > 1 && <div className="text-[10px] text-gray-400 mt-0.5">단가 {fKrwFull(c.cost_krw)}</div>}
                        </td>
                        <td className="px-2 py-2.5 align-top text-center">
                          <input
                            type="number" min="0" max="100" step="0.5"
                            value={pi.supply_cost_rate}
                            onChange={e => updateItem(pi.itemId, "supply_cost_rate", e.target.value)}
                            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-black"
                          />
                        </td>
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="text-gray-700">{fKrwFull(c.supply_cost_total)}</div>
                          {pi.qty > 1 && <div className="text-[10px] text-gray-400 mt-0.5">단가 {fKrwFull(c.supply_cost)}</div>}
                        </td>
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="font-semibold text-gray-800">{fKrwFull(c.total_cost_total)}</div>
                          {pi.qty > 1 && <div className="text-[10px] text-gray-400 mt-0.5">단가 {fKrwFull(c.total_cost)}</div>}
                        </td>
                        <td className="px-2 py-2.5 align-top text-center">
                          <input
                            type="number" min="0" max="99" step="0.5"
                            value={pi.sell_margin}
                            onChange={e => updateItem(pi.itemId, "sell_margin", e.target.value)}
                            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-black"
                          />
                        </td>
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="font-bold text-black">{fKrwFull(c.sell_price_total)}</div>
                          {pi.qty > 1 && <div className="text-[10px] text-gray-400 mt-0.5">단가 {fKrwFull(c.sell_price)}</div>}
                        </td>
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
                            <div className="text-[10px] text-gray-400 mt-0.5 text-right">{fKrwFull(pi.domestic_retail)}</div>
                          )}
                        </td>
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className="text-gray-700 font-medium">{fKrwFull(c.retail_krw_total)}</div>
                          {pi.qty > 1 && <div className="text-[10px] text-gray-400 mt-0.5">단가 {fKrwFull(c.retail_krw)}</div>}
                          <div className="text-[10px] text-gray-400 mt-0.5">€{Math.round(pi.snap.price_eur).toLocaleString()} × 1.22</div>
                        </td>
                        <td className="px-2 py-2.5 align-top text-center">
                          {pi.domestic_retail > 0 ? (
                            <span className={`font-semibold ${c.discount_rate >= 0 ? "text-blue-600" : "text-red-500"}`}>
                              {fPct(c.discount_rate)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 align-top text-right">
                          <div className={`font-semibold ${c.profit_total >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {fKrwFull(c.profit_total)}
                          </div>
                          {pi.qty > 1 && (
                            <div className={`text-[10px] mt-0.5 ${c.profit >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                              단가 {fKrwFull(c.profit)}
                            </div>
                          )}
                        </td>
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
              <SummaryCard label="유럽 총액" value={fEur(summary.total_eur)} sub="EUR 기준" />
              <SummaryCard label="총 원가" value={fKrwFull(summary.total_cost_krw)} sub={`부대비 ${fKrwFull(summary.total_supply)} 포함`} />
              <SummaryCard label="총 고객 판매가" value={fKrwFull(summary.total_sell)} highlight />
              <SummaryCard label="총 공식 소비자가" value={summary.total_retail > 0 ? fKrwFull(summary.total_retail) : "—"} sub="입력된 항목 기준" />
              <SummaryCard label="총 이익금액" value={fKrwFull(summary.total_profit)} accent={summary.total_profit >= 0 ? "green" : "red"} />
              <SummaryCard label="평균 마진율" value={fPct(summary.avg_margin)} sub="판매가 기준" accent={summary.avg_margin >= 20 ? "green" : "red"} />
              <SummaryCard label="총 부대비" value={fKrwFull(summary.total_supply)} sub="수입 부대비용" />
              <SummaryCard label="총 품목 수" value={`${summary.item_count}개`} sub={`${projItems.length}종`} />
            </div>
          </section>
        )}

        {/* ━━━━ 구역 4: 고객 견적 전환 ━━━━ */}
        <section className="px-4 py-4">
          <h3 className="text-[11px] font-extrabold text-gray-400 tracking-widest uppercase mb-3">
            04 · 고객 견적 전환
          </h3>
          <div className="flex flex-wrap gap-3">
            {/* 고객 견적서 생성 — Supabase 저장 후 견적서 탭 이동 */}
            <button
              onClick={async () => {
                if (projItems.length === 0) {
                  alert("품목을 먼저 추가하세요");
                  return;
                }
                if (!onCreateQuote) return;
                setCreatingQuote(true);
                try {
                  // ProjectItem[] → QuoteItem[] 변환 (KRW 판매가 기반)
                  const quoteItems: QuoteItem[] = projItems.map(pi => {
                    const c = calcProjectItem(pi, exchangeRate, vatRate);
                    const sellPriceEurEquiv = c.sell_price / exchangeRate;
                    return {
                      itemId: pi.itemId,
                      qty: pi.qty,
                      discount: 0,
                      snap: { ...pi.snap, price_eur: sellPriceEurEquiv },
                    };
                  });
                  await onCreateQuote({
                    title: title || "프로젝트 견적서",
                    client,
                    quote_date: projectDate,
                    currency: "KRW",
                    exchange_rate: exchangeRate,
                    items: quoteItems,
                  });
                } finally {
                  setCreatingQuote(false);
                }
              }}
              disabled={creatingQuote}
              className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
              {creatingQuote ? "생성 중..." : "고객 견적서 생성"}
            </button>
            {/* 내부 원가표 — 준비중 유지 */}
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 text-gray-400 text-xs rounded-lg cursor-not-allowed"
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
          {projItems.length === 0 && (
            <p className="mt-2 text-[10px] text-gray-300">품목을 추가하면 고객 견적서 생성이 가능합니다</p>
          )}
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

