"use client";

import { useState } from "react";
import { Quote, fEur, fKrw, discountedPrice } from "@/lib/supabase";

interface SavedQuotesProps {
  quotes: Quote[];
  onLoad: (quote: Quote) => void;
  onDelete: (id: string) => void;
}

export default function SavedQuotes({ quotes, onLoad, onDelete }: SavedQuotesProps) {
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);

  const openView = (q: Quote) => setViewingQuote(q);
  const closeView = () => setViewingQuote(null);

  return (
    <>
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
                    {/* 제목 + 정보 */}
                    <div className="font-semibold text-xs text-black truncate">{q.title || "제목 없음"}</div>
                    {q.client && <div className="text-[10px] text-gray-400 truncate mt-0.5">{q.client}</div>}
                    <div className="text-[10px] text-gray-400">{q.quote_date}</div>
                    <div className="text-xs font-bold text-black mt-1">{fEur(total)}</div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-1 mt-2">
                      {/* 보기 */}
                      <button
                        onClick={() => openView(q)}
                        className="flex-1 py-1 text-[10px] font-medium border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                      >
                        보기
                      </button>
                      {/* 불러오기(편집) */}
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

      {/* ── 견적서 보기 모달 ── */}
      {viewingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeView} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base">{viewingQuote.title || "견적서"}</h2>
                <div className="flex gap-3 mt-0.5">
                  {viewingQuote.client && <span className="text-xs text-gray-400">{viewingQuote.client}</span>}
                  {viewingQuote.quote_date && <span className="text-xs text-gray-400">{viewingQuote.quote_date}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { onLoad(viewingQuote); closeView(); }}
                  className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800"
                >
                  편집하기
                </button>
                <button onClick={closeView} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black rounded-full hover:bg-gray-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 아이템 목록 */}
            <div className="px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400">
                    <th className="pb-2 text-left font-medium w-6">No.</th>
                    <th className="pb-2 w-10"></th>
                    <th className="pb-2 text-left font-medium">브랜드 / 모델</th>
                    <th className="pb-2 text-left font-medium">피니쉬</th>
                    <th className="pb-2 text-center font-medium">수량</th>
                    <th className="pb-2 text-right font-medium">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewingQuote.items || []).map((qi, i) => {
                    const unit = discountedPrice(qi.snap?.price_eur || 0, qi.discount);
                    const total = unit * qi.qty;
                    return (
                      <tr key={qi.itemId} className="border-b border-gray-50 py-2">
                        <td className="py-2 text-gray-400 text-xs">{i + 1}</td>
                        <td className="py-2 pr-2">
                          {qi.snap?.img ? (
                            <img src={qi.snap.img} alt={qi.snap.model} className="w-9 h-9 object-cover rounded" />
                          ) : (
                            <div className="w-9 h-9 bg-gray-100 rounded" />
                          )}
                        </td>
                        <td className="py-2">
                          <div className="text-[10px] text-gray-400 font-semibold">{qi.snap?.brand}</div>
                          <div className="font-semibold text-xs">{qi.snap?.model}</div>
                          {qi.snap?.code && <div className="text-[10px] text-gray-400">{qi.snap.code}</div>}
                        </td>
                        <td className="py-2 text-xs text-gray-500 max-w-[120px] whitespace-pre-line">{qi.snap?.finish}</td>
                        <td className="py-2 text-center text-xs font-semibold">{qi.qty}</td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <div className="font-bold text-xs">{fEur(total)}</div>
                          <div className="text-[10px] text-gray-400">{fKrw(total, viewingQuote.exchange_rate || 1700)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* 합계 */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-6">
                <div className="text-right">
                  <div className="text-xs text-gray-400">합계 EUR</div>
                  <div className="font-bold text-base">
                    {fEur((viewingQuote.items || []).reduce((s, qi) =>
                      s + discountedPrice(qi.snap?.price_eur || 0, qi.discount) * qi.qty, 0))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">합계 KRW</div>
                  <div className="font-bold text-base">
                    {fKrw((viewingQuote.items || []).reduce((s, qi) =>
                      s + discountedPrice(qi.snap?.price_eur || 0, qi.discount) * qi.qty, 0) * (viewingQuote.exchange_rate || 1700), 1)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
