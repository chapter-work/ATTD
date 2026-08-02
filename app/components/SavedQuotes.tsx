"use client";

import { useState } from "react";
import { Quote, fEur, fKrw, discountedPrice } from "@/lib/supabase";

const TERMS = [
  "본 견적은 해외 브랜드의 정품 제품을 기준으로 작성되었습니다.",
  "계약 완료 후 주문은 즉시 해외 제조사로 진행되며, 모든 제품은 고객을 위한 Order Made 방식으로 제작 또는 발주됩니다. 따라서 계약 완료 후에는 모델, 옵션, 마감, 수량 등의 변경 및 주문 취소가 불가합니다.",
  "모든 주문은 상품대금 100% 선결제를 원칙으로 하며, 결제 완료 후 해외 발주가 진행됩니다.",
  "예상 납기는 해외 제조사의 생산 일정, 국제 운송 및 통관 절차에 따라 변동될 수 있으며, 일정 변경 시 신속히 안내드립니다.",
  "천연 원목, 대리석, 가죽 등 천연 소재는 제품마다 색상, 무늬 및 질감에 자연스러운 차이가 있을 수 있으며, 이는 소재 고유의 특성으로 제품의 하자에 해당하지 않습니다.",
  "설치 완료 후 제품의 외관 및 수량을 확인한 경우 정상 인도된 것으로 간주하며, 제조상의 하자는 해당 브랜드의 품질보증 기준에 따라 처리됩니다.",
  "본 견적의 유효기간은 발행일로부터 30일입니다.",
];

interface SavedQuotesProps {
  quotes: Quote[];
  onLoad: (quote: Quote) => void;
  onDelete: (id: string) => void;
}

export default function SavedQuotes({ quotes, onLoad, onDelete }: SavedQuotesProps) {
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);

  const openView = (q: Quote) => setViewingQuote(q);
  const closeView = () => setViewingQuote(null);

  const handlePrint = () => window.print();

  return (
    <>
      {/* ── 저장된 견적서 목록 ── */}
      <div className="lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm">저장된 견적서</h3>
          </div>
          <div className="overflow-y-auto max-h-80 lg:max-h-[calc(100vh-280px)]">
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
                      {/* 보기 */}
                      <button
                        onClick={() => openView(q)}
                        className="flex-1 py-1 text-[10px] font-medium border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                      >
                        보기
                      </button>
                      {/* 편집 */}
                      <button
                        onClick={() => onLoad(q)}
                        className="flex-1 py-1 text-[10px] font-medium border border-black rounded bg-black text-white hover:bg-gray-800 transition-colors"
                      >
                        편집
                      </button>
                      {/* 삭제 */}
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
          견적서 보기 모달 (출력 프리뷰)
          ══════════════════════════════════════════ */}
      {viewingQuote && (
        <>
          {/* ── 화면용 오버레이 모달 (no-print) ── */}
          <div className="fixed inset-0 z-50 flex items-start justify-center no-print" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
            {/* 배경 딤 */}
            <div className="absolute inset-0 bg-black/50" onClick={closeView} />

            {/* 모달 컨테이너 */}
            <div className="relative bg-white w-full max-w-2xl mx-4 mt-4 mb-4 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-env(safe-area-inset-top,0px)-2rem)]">

              {/* 모달 상단 툴바 (화면 전용) */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white rounded-t-2xl">
                <span className="text-sm font-semibold text-gray-700">출력 미리보기</span>
                <div className="flex items-center gap-2">
                  {/* PDF 저장 / 인쇄 버튼 */}
                  <button
                    onClick={handlePrint}
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
                  <button
                    onClick={closeView}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 스크롤 영역 — 실제 출력 프리뷰 */}
              <div className="flex-1 overflow-y-auto px-1 py-2">
                <QuotePreview quote={viewingQuote} />
              </div>
            </div>
          </div>

          {/* ── 인쇄 전용 레이아웃 ── */}
          {/* print: 클래스로 보이고 화면에서는 숨김 */}
          <div className="print-only-quote hidden print:block">
            <QuotePreview quote={viewingQuote} />
          </div>
        </>
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────
   QuotePreview — 화면 & 인쇄 공용 레이아웃
   ──────────────────────────────────────────────────────── */
function QuotePreview({ quote }: { quote: Quote }) {
  const totEur = (quote.items || []).reduce(
    (s, qi) => s + discountedPrice(qi.snap?.price_eur || 0, qi.discount) * qi.qty, 0
  );
  const exchangeRate = quote.exchange_rate || 1700;
  const totKrw = totEur * exchangeRate;
  const currency = quote.currency || "BOTH";

  return (
    <div className="bg-white text-black px-8 py-8 min-h-[1000px] print:px-12 print:py-10">

      {/* ── ATTD 브랜드 타이틀 (견적서 최상단 고정) ── */}
      <div className="mb-8 pb-6 border-b-2 border-black">
        <div className="text-4xl font-black tracking-[0.2em] text-black">ATTD</div>
        <div className="text-base font-light tracking-[0.1em] text-gray-600 mt-1">
          Private Furniture Curation
        </div>
        <div className="text-sm tracking-[0.08em] text-gray-400 mt-0.5">
          by Chapter Design
        </div>
      </div>

      {/* ── 견적서 정보 헤더 ── */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-black">{quote.title || "견적서"}</h2>
          {quote.client && (
            <div className="text-sm text-gray-500 mt-1">
              고객사: <span className="font-medium text-black">{quote.client}</span>
            </div>
          )}
        </div>
        <div className="text-right text-sm text-gray-500">
          {quote.quote_date && <div>발행일: {quote.quote_date}</div>}
          <div className="mt-0.5">환율: ₩{exchangeRate.toLocaleString()}/€</div>
        </div>
      </div>

      {/* ── 품목 테이블 ── */}
      <table className="w-full text-sm border-collapse mb-6">
        <thead>
          <tr className="border-y border-black">
            <th className="py-2 text-left font-semibold text-xs w-7">No.</th>
            <th className="py-2 w-10 text-left font-semibold text-xs">사진</th>
            <th className="py-2 text-left font-semibold text-xs">브랜드 / 모델</th>
            <th className="py-2 text-left font-semibold text-xs">피니쉬</th>
            <th className="py-2 text-center font-semibold text-xs w-10">수량</th>
            <th className="py-2 text-right font-semibold text-xs w-28">합계</th>
          </tr>
        </thead>
        <tbody>
          {(quote.items || []).map((qi, i) => {
            const unit = discountedPrice(qi.snap?.price_eur || 0, qi.discount);
            const total = unit * qi.qty;
            return (
              <tr key={qi.itemId} className="border-b border-gray-100">
                <td className="py-2.5 text-gray-400 text-xs align-top">{i + 1}</td>
                <td className="py-2.5 pr-2 align-top">
                  {qi.snap?.img ? (
                    <img src={qi.snap.img} alt={qi.snap.model} className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded" />
                  )}
                </td>
                <td className="py-2.5 align-top">
                  <div className="text-[10px] text-gray-500 font-semibold tracking-wide">{qi.snap?.brand}</div>
                  <div className="font-semibold text-xs text-black">{qi.snap?.model}</div>
                  {qi.snap?.code && <div className="text-[10px] text-gray-400">{qi.snap.code}</div>}
                  {qi.snap?.dims && <div className="text-[10px] text-gray-400 mt-0.5">{qi.snap.dims}</div>}
                </td>
                <td className="py-2.5 text-xs text-gray-500 align-top max-w-[100px] whitespace-pre-line">
                  {qi.snap?.finish}
                </td>
                <td className="py-2.5 text-center text-xs font-semibold align-top">{qi.qty}</td>
                <td className="py-2.5 text-right align-top whitespace-nowrap">
                  {(currency === "BOTH" || currency === "EUR") && (
                    <div className="font-bold text-xs">{fEur(total)}</div>
                  )}
                  {(currency === "BOTH" || currency === "KRW") && (
                    <div className="text-[10px] text-gray-400">{fKrw(total, exchangeRate)}</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── 합계 ── */}
      <div className="flex justify-end gap-8 py-4 border-t-2 border-black mb-8">
        {(currency === "BOTH" || currency === "EUR") && (
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5">합계 EUR</div>
            <div className="font-black text-xl">{fEur(totEur)}</div>
          </div>
        )}
        {(currency === "BOTH" || currency === "KRW") && (
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-0.5">합계 KRW</div>
            <div className="font-black text-xl">{fKrw(totKrw, 1)}</div>
          </div>
        )}
      </div>

      {/* ── Terms & Conditions ── */}
      <div className="pt-6 border-t border-gray-200">
        <h4 className="text-[11px] font-bold text-gray-700 mb-3 tracking-wider uppercase">
          Terms &amp; Conditions
        </h4>
        <ol className="space-y-1.5">
          {TERMS.map((t, i) => (
            <li key={i} className="flex gap-2 text-[10px] text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-600 flex-shrink-0">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 pt-4 border-t border-gray-200 text-[10px] text-gray-500 leading-relaxed font-medium">
          ATTD는 세계 각국의 프리미엄 브랜드를 고객의 공간에 가장 완성도 높은 방식으로 연결합니다. 모든 제품은 고객님만을 위해 정식 주문 및 수입되는 프라이빗 오더 상품입니다.
        </p>
      </div>
    </div>
  );
}
