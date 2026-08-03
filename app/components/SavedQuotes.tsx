"use client";

import { useState } from "react";
import { Quote, fEur, fKrw, discountedPrice } from "@/lib/supabase";

/* ─────────────────────────────────────────────────────────
   Terms & Conditions 최신 문구
───────────────────────────────────────────────────────── */
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

interface SavedQuotesProps {
  quotes: Quote[];
  onLoad: (quote: Quote) => void;
  onDelete: (id: string) => void;
  compact?: boolean; // QuoteBuilder 내 인라인 모드
}

/* ─────────────────────────────────────────────────────────
   인쇄 전용 팝업 윈도우 열기
   — window.print() 대신 새 윈도우를 열어 앱 레이아웃과 완전 분리
───────────────────────────────────────────────────────── */
function openPrintWindow(quote: Quote) {
  const totEur = (quote.items || []).reduce(
    (s, qi) => s + discountedPrice(qi.snap?.price_eur || 0, qi.discount) * qi.qty, 0
  );
  const exchangeRate = quote.exchange_rate || 1700;
  const totKrw = totEur * exchangeRate;
  const currency = quote.currency || "BOTH";

  /* ── 품목 행 HTML 생성 ── */
  const rowsHtml = (quote.items || []).map((qi, i) => {
    const unit = discountedPrice(qi.snap?.price_eur || 0, qi.discount);
    const total = unit * qi.qty;

    const eurUnit   = fEur(unit);
    const eurTotal  = fEur(total);
    const krwUnit   = fKrw(unit, exchangeRate);
    const krwTotal  = fKrw(total, exchangeRate);
    const imgHtml   = qi.snap?.img
      ? `<img src="${qi.snap.img}" style="width:52px;height:52px;object-fit:cover;border-radius:4px;" />`
      : `<div style="width:52px;height:52px;background:#f0f0f0;border-radius:4px;"></div>`;

    // 단가 셀
    const unitHtml =
      currency === "EUR"  ? `<b>${eurUnit}</b>` :
      currency === "KRW"  ? `<b>${krwUnit}</b>` :
      `<b>${eurUnit}</b><br/><span style="color:#999;font-size:10px;">${krwUnit}</span>`;

    // 합계 셀
    const totalCellHtml =
      currency === "EUR"  ? `<b>${eurTotal}</b>` :
      currency === "KRW"  ? `<b>${krwTotal}</b>` :
      `<b>${eurTotal}</b><br/><span style="color:#999;font-size:10px;">${krwTotal}</span>`;

    return `
      <tr>
        <td style="padding:10px 6px;vertical-align:top;color:#aaa;font-size:11px;">${i + 1}</td>
        <td style="padding:10px 4px;vertical-align:top;width:60px;">${imgHtml}</td>
        <td style="padding:10px 8px;vertical-align:top;">
          <div style="font-size:10px;color:#888;font-weight:600;letter-spacing:0.04em;">${qi.snap?.brand || ""}</div>
          <div style="font-size:12px;font-weight:700;color:#111;">${qi.snap?.model || ""}</div>
        </td>
        <td style="padding:10px 8px;vertical-align:top;font-size:11px;color:#555;max-width:90px;">${qi.snap?.finish || ""}</td>
        <td style="padding:10px 6px;vertical-align:top;text-align:right;font-size:12px;white-space:nowrap;">${unitHtml}</td>
        <td style="padding:10px 6px;vertical-align:top;text-align:center;font-size:12px;font-weight:700;">${qi.qty}</td>
        <td style="padding:10px 6px;vertical-align:top;text-align:right;font-size:12px;white-space:nowrap;">${totalCellHtml}</td>
      </tr>`;
  }).join("");

  /* ── 합계 HTML ── */
  const totalHtml =
    currency === "KRW"
      ? `<div style="display:flex;align-items:flex-end;gap:8px;">
           <div class="total-label" style="padding-bottom:2px;">합계</div>
           <div class="total-value">${fKrw(totKrw, 1)}</div>
         </div>`
      : currency === "EUR"
      ? `<div style="display:flex;align-items:flex-end;gap:8px;">
           <div class="total-label" style="padding-bottom:2px;">합계</div>
           <div class="total-value">${fEur(totEur)}</div>
         </div>`
      : `<div style="display:flex;align-items:flex-end;gap:8px;">
           <div class="total-label" style="padding-bottom:2px;">합계</div>
           <div class="total-value">${fEur(totEur)}<span style="font-weight:400;color:#999;font-size:11px;margin-left:8px;">${fKrw(totKrw, 1)}</span></div>
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

  /* ── 전체 HTML 문서 ── */
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ATTD 견적서 — ${quote.title || ""}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      color: #111;
      background: #fff;
      padding: 40px 48px;
      max-width: 800px;
      margin: 0 auto;
    }

    /* ATTD 브랜드 헤더 */
    .attd-header {
      padding-top: 28px;
      padding-bottom: 22px;
      border-bottom: 2px solid #111;
      margin-bottom: 28px;
    }
    .attd-brand    { font-size: 38px; font-weight: 900; letter-spacing: 0.18em; color: #111; line-height:1; }
    .attd-sub      { font-size: 13px; font-weight: 300; letter-spacing: 0.08em; color: #666; margin-top: 6px; }
    .attd-by       { font-size: 11px; letter-spacing: 0.06em; color: #aaa; margin-top: 3px; }

    /* 견적 정보 */
    .quote-info    { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .quote-title   { font-size: 18px; font-weight: 800; color: #111; }
    .quote-client  { font-size: 13px; color: #555; margin-top: 4px; }
    .quote-meta    { text-align: right; font-size: 12px; color: #888; line-height: 1.6; }

    /* 품목 테이블 */
    table          { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    thead tr       { border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; }
    th             { padding: 8px 6px; font-size: 11px; font-weight: 700; color: #333; }
    th:nth-child(1){ text-align:left; width:28px; }
    th:nth-child(2){ text-align:left; width:60px; }
    th:nth-child(3){ text-align:left; }
    th:nth-child(4){ text-align:left; width:90px; }
    th:nth-child(5){ text-align:right; width:100px; }
    th:nth-child(6){ text-align:center; width:40px; }
    th:nth-child(7){ text-align:right; width:110px; }
    tbody tr       { border-bottom: 1px solid #eee; }

    /* 합계 — 굵은 2px 선, 레이블+금액 가로 정렬 */
    .totals        { display: flex; justify-content: flex-end; gap: 32px;
                     border-top: 2px solid #111; border-bottom: 2px solid #111;
                     padding: 10px 0; margin-top: 0; margin-bottom: 28px; }
    .totals .total-label { font-size: 11px; color: #999; text-align: right; line-height:1; }
    .totals .total-value { font-size: 13px; font-weight: 700; color: #111; text-align: right; line-height:1; }

    /* 서명란 — 3칸 1/3 균등 */
    .sign-section {
      margin-bottom: 32px;
      padding: 22px 0 0 0;
    }
    .sign-row {
      display: flex; gap: 20px; align-items: flex-end;
    }
    .sign-box-date,
    .sign-box-name,
    .sign-box-sign  { flex: 0 0 calc(33.33% - 14px); width: calc(33.33% - 14px); }
    .sign-label {
      font-size: 9px; color: #aaa; margin-bottom: 12px;
      letter-spacing: 0.14em; font-weight: 600; text-transform: uppercase;
    }
    .sign-line {
      min-height: 40px;
      border-bottom: 1.5px solid #111;
    }

    /* T&C — 위 줄 제거 */
    .tc-section    { padding-top: 4px; }
    .tc-title      { font-size: 11px; font-weight: 800; letter-spacing: 0.12em; color: #444;
                     text-transform: uppercase; margin-bottom: 10px; }
    .tc-list       { list-style: none; padding: 0; }
    .tc-footer     { margin-top: 16px; padding-top: 14px; border-top: 1px solid #eee; }

    /* ── 상단 고정 툴바 (화면 전용) ── */
    .toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 52px;
      background: #111;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 999;
    }
    .toolbar-title {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.12em;
    }
    .toolbar-actions { display: flex; gap: 8px; align-items: center; }
    .btn-print {
      display: flex; align-items: center; gap: 6px;
      background: #fff; color: #111;
      border: none; border-radius: 8px;
      padding: 7px 14px;
      font-size: 12px; font-weight: 700;
      cursor: pointer;
    }
    .btn-print:active { background: #e5e5e5; }
    .btn-close {
      display: flex; align-items: center; justify-content: center;
      width: 34px; height: 34px;
      background: rgba(255,255,255,0.12); color: #fff;
      border: none; border-radius: 50%;
      font-size: 18px; cursor: pointer;
    }
    .btn-close:active { background: rgba(255,255,255,0.25); }

    /* 툴바 높이만큼 body 상단 여백 */
    body { padding-top: 72px; }

    /* 인쇄 설정 */
    @page {
      size: A4 portrait;
      margin: 14mm 12mm;
      /* 브라우저 기본 URL·날짜 헤더/푸터 제거, 페이지 번호만 우하단 표시 */
      @top-left   { content: none; }
      @top-right  { content: none; }
      @top-center { content: none; }
      @bottom-left  { content: none; }
      @bottom-right { content: none; }
      @bottom-center { content: counter(page) " / " counter(pages); font-size: 9pt; color: #aaa; }
    }
    @media print {
      .toolbar { display: none !important; }
      body { padding: 0 48px; }
      .no-print { display: none !important; }
    }
    /* 모바일 대응 */
    @media (max-width: 600px) {
      body { padding: 72px 12px 20px; }
      .attd-brand { font-size: 28px; }
      th, td { font-size: 10px !important; padding: 7px 3px !important; }
      th:nth-child(4) { display: none; }  /* 피니쉬 모바일 숨김 */
      td:nth-child(4) { display: none; }  /* 피니쉬 td 모바일 숨김 */
    }
  </style>
</head>
<body>

  <!-- 상단 툴바 (화면 전용, 인쇄 시 숨김) -->
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

  <!-- ATTD 브랜드 타이틀 -->
  <div class="attd-header">
    <div class="attd-brand">ATTD</div>
    <div class="attd-sub">Private Furniture Curation</div>
    <div class="attd-by">by Chapter Design</div>
  </div>

  <!-- 견적서 정보 -->
  <div class="quote-info">
    <div>
      <div class="quote-title">${quote.title || "견적서"}</div>
      ${quote.client ? `<div class="quote-client"><b>${quote.client}</b></div>` : ""}
    </div>
    <div class="quote-meta">
      ${quote.quote_date ? `<div>${quote.quote_date}</div>` : ""}
    </div>
  </div>

  <!-- 품목 테이블 -->
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

  <!-- 합계 -->
  <div class="totals">
    ${totalHtml}
  </div>

  <!-- 서명란 -->
  <div class="sign-section">
    <div class="sign-row">
      <div class="sign-box-date">
        <div class="sign-label">DATE</div>
        <div class="sign-line"></div>
      </div>
      <div class="sign-box-name">
        <div class="sign-label">NAME</div>
        <div class="sign-line"></div>
      </div>
      <div class="sign-box-sign">
        <div class="sign-label">SIGNATURE</div>
        <div class="sign-line"></div>
      </div>
    </div>
  </div>

  <!-- Terms & Conditions -->
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

/* ─────────────────────────────────────────────────────────
   SavedQuotes 컴포넌트
───────────────────────────────────────────────────────── */
export default function SavedQuotes({ quotes, onLoad, onDelete, compact }: SavedQuotesProps) {
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);

  const openView  = (q: Quote) => setViewingQuote(q);
  const closeView = () => setViewingQuote(null);

  return (
    <>
      {/* ── 저장된 견적서 목록 ── */}
      <div className={compact ? "" : "lg:w-64 flex-shrink-0"}>
        <div className={compact ? "" : "bg-white rounded-xl border border-gray-100 overflow-hidden"}>
          {!compact && (
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm">저장된 견적서</h3>
            </div>
          )}
          <div className={compact ? "" : "overflow-y-auto max-h-80 lg:max-h-[calc(100vh-280px)]"}>
            {quotes.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-xs">
                저장된 견적서가 없습니다
              </div>
            ) : (
              quotes.map(q => {
                const total = (q.items || []).reduce(
                  (s, qi) => s + discountedPrice(qi.snap?.price_eur || 0, qi.discount) * qi.qty, 0
                );
                return (
                  <div key={q.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <div className="font-semibold text-xs text-black truncate">{q.title || "제목 없음"}</div>
                    {q.client && <div className="text-[10px] text-gray-400 truncate mt-0.5">{q.client}</div>}
                    <div className="text-[10px] text-gray-400">{q.quote_date}</div>
                    <div className="text-xs font-bold text-black mt-1">{fEur(total)}</div>

                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => openView(q)}
                        className="flex-1 py-1 text-[10px] font-medium border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                      >
                        보기
                      </button>
                      <button
                        onClick={() => onLoad(q)}
                        className="flex-1 py-1 text-[10px] font-medium border border-black rounded bg-black text-white hover:bg-gray-800 transition-colors"
                      >
                        편집
                      </button>
                      <button
                        onClick={() => onDelete(q.id)}
                        className="px-2 py-1 text-[10px] border border-gray-200 rounded text-gray-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          견적서 보기 모달 (화면 미리보기)
          ══════════════════════════════════════════ */}
      {viewingQuote && (
        <div className="fixed inset-0 z-50 flex items-start justify-center"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          {/* 배경 딤 */}
          <div className="absolute inset-0 bg-black/50" onClick={closeView} />

          {/* 모달 */}
          <div className="relative bg-white w-full max-w-2xl mx-4 mt-4 mb-4 rounded-2xl shadow-2xl flex flex-col"
            style={{ maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - 2rem)" }}>

            {/* 상단 툴바 */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-100 rounded-t-2xl">
              <span className="text-sm font-semibold text-gray-700">출력 미리보기</span>
              <div className="flex items-center gap-2">
                {/* 인쇄/PDF 버튼 — 새 윈도우로 열어서 정확하게 출력 */}
                <button
                  onClick={() => openPrintWindow(viewingQuote)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  인쇄 / PDF 저장
                </button>
                {/* 편집 */}
                <button
                  onClick={() => { onLoad(viewingQuote); closeView(); }}
                  className="px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  편집
                </button>
                {/* 닫기 */}
                <button onClick={closeView}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 스크롤 프리뷰 영역 */}
            <div className="flex-1 overflow-y-auto">
              <QuotePreview quote={viewingQuote} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   QuotePreview — 화면용 미리보기 (스크롤 가능)
   인쇄는 openPrintWindow() 팝업으로 완전 분리
───────────────────────────────────────────────────────── */
function QuotePreview({ quote }: { quote: Quote }) {
  const totEur = (quote.items || []).reduce(
    (s, qi) => s + discountedPrice(qi.snap?.price_eur || 0, qi.discount) * qi.qty, 0
  );
  const exchangeRate = quote.exchange_rate || 1700;
  const totKrw       = totEur * exchangeRate;
  const currency     = quote.currency || "BOTH";

  return (
    <div className="bg-white text-black px-8 py-8">

      {/* ATTD 브랜드 타이틀 — 상단 여백 추가 */}
      <div className="mt-5 mb-7 pb-5 border-b-2 border-black">
        <div className="text-4xl font-black tracking-[0.2em]">ATTD</div>
        <div className="text-sm font-light tracking-[0.08em] text-gray-600 mt-1.5">Private Furniture Curation</div>
        <div className="text-xs tracking-[0.06em] text-gray-400 mt-0.5">by Chapter Design</div>
      </div>

      {/* 견적서 정보 */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="text-xl font-bold">{quote.title || "견적서"}</div>
          {quote.client && <div className="text-sm font-semibold text-black mt-1">{quote.client}</div>}
        </div>
        <div className="text-right text-xs text-gray-500">
          {quote.quote_date && <div>{quote.quote_date}</div>}
        </div>
      </div>

      {/* 품목 테이블 — 모바일 반응형 */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm border-collapse mb-0" style={{minWidth: "420px"}}>
          <thead>
            <tr className="border-y-2 border-black">
              <th className="py-2 px-1 text-left font-bold text-[10px] w-6">No.</th>
              <th className="py-2 px-1 text-left w-12 font-bold text-[10px]">사진</th>
              <th className="py-2 px-1 text-left font-bold text-[10px]">브랜드 / 모델</th>
              <th className="py-2 px-1 text-left font-bold text-[10px] w-16">피니쉬</th>
              <th className="py-2 px-1 text-right font-bold text-[10px] w-20">단가</th>
              <th className="py-2 px-1 text-center font-bold text-[10px] w-8">수량</th>
              <th className="py-2 px-1 text-right font-bold text-[10px] w-20">합계</th>
            </tr>
          </thead>
          <tbody>
            {(quote.items || []).map((qi, i) => {
              const unit  = discountedPrice(qi.snap?.price_eur || 0, qi.discount);
              const total = unit * qi.qty;
              return (
                <tr key={qi.itemId} className="border-b border-gray-100">
                  <td className="py-2 px-1 text-gray-400 text-[10px] align-top">{i + 1}</td>
                  <td className="py-2 px-1 align-top">
                    {qi.snap?.img
                      ? <img src={qi.snap.img} alt={qi.snap.model} className="w-12 h-12 object-cover rounded" />
                      : <div className="w-12 h-12 bg-gray-100 rounded" />}
                  </td>
                  <td className="py-2 px-1 align-top">
                    <div className="text-[9px] text-gray-500 font-semibold tracking-wide leading-tight">{qi.snap?.brand}</div>
                    <div className="font-bold text-[11px] text-black leading-snug">{qi.snap?.model}</div>
                  </td>
                  <td className="py-2 px-1 text-[10px] text-gray-500 align-top leading-snug">{qi.snap?.finish || "—"}</td>
                  <td className="py-2 px-1 text-right align-top whitespace-nowrap">
                    {currency === "KRW"
                      ? <div className="font-semibold text-[11px]">{fKrw(unit, exchangeRate)}</div>
                      : currency === "EUR"
                      ? <div className="font-semibold text-[11px]">{fEur(unit)}</div>
                      : <>
                          <div className="font-semibold text-[11px]">{fEur(unit)}</div>
                          <div className="text-[9px] text-gray-400">{fKrw(unit, exchangeRate)}</div>
                        </>}
                  </td>
                  <td className="py-2 px-1 text-center text-[11px] font-bold align-top">{qi.qty}</td>
                  <td className="py-2 px-1 text-right align-top whitespace-nowrap">
                    {currency === "KRW"
                      ? <div className="font-bold text-[11px]">{fKrw(total, exchangeRate)}</div>
                      : currency === "EUR"
                      ? <div className="font-bold text-[11px]">{fEur(total)}</div>
                      : <>
                          <div className="font-bold text-[11px]">{fEur(total)}</div>
                          <div className="text-[9px] text-gray-400">{fKrw(total, exchangeRate)}</div>
                        </>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 합계 */}
      <div className="flex justify-end mb-6"
        style={{borderTop: "2px solid #111", borderBottom: "2px solid #111", padding: "10px 0"}}>
        <div style={{display:"flex", alignItems:"flex-end", gap:"8px"}}>
          <div className="text-[11px] text-gray-400" style={{paddingBottom:"2px"}}>합계</div>
          <div className="text-sm font-bold text-black">
            {currency === "KRW" ? fKrw(totKrw, 1)
             : currency === "EUR" ? fEur(totEur)
             : <>{fEur(totEur)}<span className="font-normal text-gray-400 ml-2 text-[11px]">{fKrw(totKrw, 1)}</span></>}
          </div>
        </div>
      </div>

      {/* 서명란 */}
      <div className="pt-5 mb-6">
        <div className="flex items-end" style={{gap: "20px"}}>
          <div style={{flex: "0 0 calc(33.33% - 14px)", width: "calc(33.33% - 14px)"}}>
            <div className="text-[10px] text-gray-400 mb-3 font-medium tracking-widest uppercase">Date</div>
            <div className="min-h-[40px]" style={{borderBottom: "1.5px solid #111"}} />
          </div>
          <div style={{flex: "0 0 calc(33.33% - 14px)", width: "calc(33.33% - 14px)"}}>
            <div className="text-[10px] text-gray-400 mb-3 font-medium tracking-widest uppercase">Name</div>
            <div className="min-h-[40px]" style={{borderBottom: "1.5px solid #111"}} />
          </div>
          <div style={{flex: "0 0 calc(33.33% - 14px)", width: "calc(33.33% - 14px)"}}>
            <div className="text-[10px] text-gray-400 mb-3 font-medium tracking-widest uppercase">Signature</div>
            <div className="min-h-[40px]" style={{borderBottom: "1.5px solid #111"}} />
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="pt-1">
        <h4 className="text-[11px] font-extrabold text-gray-600 mb-3 tracking-widest uppercase">
          Terms &amp; Conditions
        </h4>
        <ol className="space-y-2">
          {TERMS.map((t, i) => (
            <li key={i} className="flex gap-2 text-[10px] text-gray-500 leading-relaxed">
              <span className="font-bold text-gray-600 flex-shrink-0">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 pt-4 border-t border-gray-200 space-y-2">
          {TERMS_FOOTER.split("\n\n").map((p, i) => (
            <p key={i} className="text-[10px] text-gray-500 leading-relaxed">{p}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
