"use client";

import { Quote, fEur, fKrw, discountedPrice } from "@/lib/supabase";

interface SavedQuotesProps {
  quotes: Quote[];
  onLoad: (quote: Quote) => void;
  onDelete: (id: string) => void;
}

export default function SavedQuotes({ quotes, onLoad, onDelete }: SavedQuotesProps) {
  return (
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
                  <button className="w-full text-left" onClick={() => onLoad(q)}>
                    <div className="font-semibold text-xs text-black truncate">{q.title || "제목 없음"}</div>
                    {q.client && <div className="text-[10px] text-gray-400 truncate">{q.client}</div>}
                    <div className="text-[10px] text-gray-400 mt-0.5">{q.quote_date}</div>
                    <div className="text-xs font-bold text-black mt-1">{fEur(total)}</div>
                  </button>
                  <button
                    onClick={() => onDelete(q.id)}
                    className="mt-1 text-[10px] text-gray-300 hover:text-red-400 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
