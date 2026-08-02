"use client";

import { useState, useEffect } from "react";
import { Item, Quote, QuoteItem, fEur, fKrw, discountedPrice } from "@/lib/supabase";

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

interface QuoteBuilderProps {
  items: Item[];
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
  onSave: (quote: Partial<Quote>) => Promise<void>;
  editingQuote?: Quote | null;
  onNewQuote: () => void;
}

export default function QuoteBuilder({
  items, exchangeRate, onExchangeRateChange, onSave, editingQuote, onNewQuote
}: QuoteBuilderProps) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<"BOTH" | "EUR" | "KRW">("BOTH");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingQuote) {
      setTitle(editingQuote.title || "");
      setClient(editingQuote.client || "");
      setQuoteDate(editingQuote.quote_date || new Date().toISOString().slice(0, 10));
      setCurrency(editingQuote.currency || "BOTH");
      setQuoteItems(editingQuote.items || []);
    } else {
      setTitle(""); setClient("");
      setQuoteDate(new Date().toISOString().slice(0, 10));
      setCurrency("BOTH"); setQuoteItems([]);
    }
  }, [editingQuote]);

  const filteredPicker = items.filter(i => {
    const q = pickerSearch.toLowerCase();
    return !q || i.brand.toLowerCase().includes(q) || i.model.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q);
  });

  const addItem = (item: Item) => {
    const exists = quoteItems.find(qi => qi.itemId === item.id);
    if (exists) {
      setQuoteItems(prev => prev.map(qi => qi.itemId === item.id ? { ...qi, qty: qi.qty + 1 } : qi));
    } else {
      setQuoteItems(prev => [...prev, { itemId: item.id, qty: 1, discount: item.discount, snap: item }]);
    }
  };

  const updateQty = (itemId: string, qty: number) => {
    if (qty < 1) return;
    setQuoteItems(prev => prev.map(qi => qi.itemId === itemId ? { ...qi, qty } : qi));
  };

  const updateDisc = (itemId: string, discount: number) => {
    setQuoteItems(prev => prev.map(qi => qi.itemId === itemId ? { ...qi, discount } : qi));
  };

  const removeItem = (itemId: string) => {
    setQuoteItems(prev => prev.filter(qi => qi.itemId !== itemId));
  };

  const totEur = quoteItems.reduce((s, qi) => s + discountedPrice(qi.snap.price_eur, qi.discount) * qi.qty, 0);
  const totKrw = totEur * exchangeRate;

  const handleSave = async () => {
    if (!title.trim()) { alert("견적서 제목을 입력해주세요"); return; }
    setSaving(true);
    try {
      await onSave({ title, client, quote_date: quoteDate, currency, exchange_rate: exchangeRate, items: quoteItems });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">

      {/* ── 좌측: 품목 피커 ── */}
      <div className="lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm mb-2">품목 선택</h3>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text" value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="검색..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-80 lg:max-h-[calc(100vh-280px)]">
            {/* 검색 결과 없음 안내 */}
            {filteredPicker.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <svg className="text-gray-200 mb-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p className="text-xs text-gray-400 font-medium">
                  {pickerSearch ? `"${pickerSearch}" 검색 결과가 없습니다` : "등록된 품목이 없습니다"}
                </p>
                {pickerSearch && (
                  <button onClick={() => setPickerSearch("")} className="mt-2 text-[10px] text-gray-400 underline">
                    검색 초기화
                  </button>
                )}
              </div>
            ) : (
              filteredPicker.map(item => {
                const dp = discountedPrice(item.price_eur, item.discount);
                const isAdded = quoteItems.some(qi => qi.itemId === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isAdded ? "bg-black/5" : ""}`}
                  >
                    {item.img ? (
                      <img src={item.img} alt={item.model} className="w-9 h-9 object-cover rounded flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 bg-gray-100 rounded flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold text-gray-400">{item.brand}</div>
                      <div className="text-xs font-medium text-black truncate">{item.model}</div>
                      <div className="text-[10px] font-bold text-black">{fEur(dp)}</div>
                    </div>
                    {isAdded && <span className="text-[10px] text-green-600 font-bold flex-shrink-0">추가됨</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 중앙: 견적 빌더 ── */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden print-area">

          {/* 견적서 메타 (화면 전용) */}
          <div className="px-5 py-4 border-b border-gray-100 no-print">
            <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="견적서 제목"
                className="flex-1 min-w-[180px] font-semibold text-base border-0 border-b-2 border-gray-100 focus:border-black focus:outline-none py-1 transition-colors"
              />
              <div className="flex gap-2">
                <button onClick={onNewQuote} className="px-3 py-1.5 border border-gray-200 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  새 견적서
                </button>
                <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input value={client} onChange={e => setClient(e.target.value)} placeholder="고객사명"
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-black" />
              <input type="date" value={quoteDate} onChange={e => setQuoteDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-black" />
              <select value={currency} onChange={e => setCurrency(e.target.value as any)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-black bg-white">
                <option value="BOTH">EUR + KRW</option>
                <option value="EUR">EUR만</option>
                <option value="KRW">KRW만</option>
              </select>
            </div>
          </div>

          {/* 인쇄용 헤더 — ATTD 고정 타이틀 + 견적 정보 */}
          <div className="hidden print:block px-8 pt-10 pb-4">
            {/* ATTD 브랜드 타이틀 */}
            <div className="mb-6 pb-5 border-b-2 border-black">
              <div className="text-3xl font-black tracking-[0.15em] text-black">ATTD</div>
              <div className="text-sm font-light tracking-[0.08em] text-gray-600 mt-0.5">Private Furniture Curation</div>
              <div className="text-xs tracking-[0.06em] text-gray-400 mt-0.5">by Chapter Design</div>
            </div>
            {/* 견적서 정보 */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-xl font-bold">{title || "견적서"}</h1>
                {client && <p className="text-sm text-gray-500 mt-1">고객사: {client}</p>}
              </div>
              {quoteDate && <p className="text-sm text-gray-500 mt-1">날짜: {quoteDate}</p>}
            </div>
            <hr className="border-gray-200" />
          </div>

          {/* 견적 아이템 테이블 */}
          {quoteItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-10 h-10 border-2 border-gray-200 rounded mb-2" />
              <p className="text-sm">왼쪽에서 품목을 선택하세요</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                    <th className="px-3 py-2 text-left font-medium w-8">No.</th>
                    <th className="px-2 py-2 w-12">사진</th>
                    <th className="px-3 py-2 text-left font-medium">브랜드 / 모델</th>
                    <th className="px-3 py-2 text-left font-medium">스펙</th>
                    <th className="px-3 py-2 text-left font-medium">피니쉬</th>
                    <th className="px-3 py-2 text-center font-medium no-print">수량</th>
                    <th className="px-3 py-2 text-right font-medium">단가</th>
                    <th className="px-3 py-2 text-center font-medium no-print">할인율</th>
                    <th className="px-3 py-2 text-right font-medium">합계</th>
                    <th className="px-2 py-2 no-print w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {quoteItems.map((qi, i) => {
                    const unit = discountedPrice(qi.snap.price_eur, qi.discount);
                    const total = unit * qi.qty;
                    return (
                      <tr key={qi.itemId} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-2 py-2">
                          {qi.snap.img ? (
                            <img src={qi.snap.img} alt={qi.snap.model} className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded" />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-[10px] text-gray-400 font-semibold">{qi.snap.brand}</div>
                          <div className="font-semibold text-xs">{qi.snap.model}</div>
                          {qi.snap.code && <div className="text-[10px] text-gray-400">{qi.snap.code}</div>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 max-w-[120px] whitespace-pre-line">{qi.snap.dims}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 max-w-[120px] whitespace-pre-line">{qi.snap.finish}</td>
                        <td className="px-3 py-2 text-center no-print">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => updateQty(qi.itemId, qi.qty - 1)}
                              className="w-6 h-6 border border-gray-200 rounded text-xs hover:bg-gray-100">-</button>
                            <span className="w-6 text-center text-sm font-semibold">{qi.qty}</span>
                            <button onClick={() => updateQty(qi.itemId, qi.qty + 1)}
                              className="w-6 h-6 border border-gray-200 rounded text-xs hover:bg-gray-100">+</button>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {(currency === "BOTH" || currency === "EUR") && <div className="font-semibold text-xs">{fEur(unit)}</div>}
                          {(currency === "BOTH" || currency === "KRW") && <div className="text-[10px] text-gray-400">{fKrw(unit, exchangeRate)}</div>}
                        </td>
                        <td className="px-3 py-2 text-center no-print">
                          <input
                            type="number" min="0" max="100" value={qi.discount}
                            onChange={e => updateDisc(qi.itemId, parseFloat(e.target.value) || 0)}
                            className="w-14 text-center border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-black"
                          />
                          <span className="text-xs text-gray-400 ml-0.5">%</span>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {(currency === "BOTH" || currency === "EUR") && <div className="font-bold text-xs">{fEur(total)}</div>}
                          {(currency === "BOTH" || currency === "KRW") && <div className="text-[10px] text-gray-400">{fKrw(total, exchangeRate)}</div>}
                        </td>
                        {/* 삭제 버튼 — 명확한 휴지통 아이콘 + 빨간 hover */}
                        <td className="px-2 py-2 no-print">
                          <button
                            onClick={() => removeItem(qi.itemId)}
                            title="항목 삭제"
                            className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4h6v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 합계 푸터 */}
          {quoteItems.length > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex flex-wrap gap-4">
                {(currency === "BOTH" || currency === "EUR") && (
                  <div>
                    <span className="text-xs text-gray-400">합계 EUR</span>
                    <div className="font-bold text-base">{fEur(totEur)}</div>
                  </div>
                )}
                {(currency === "BOTH" || currency === "KRW") && (
                  <div>
                    <span className="text-xs text-gray-400">합계 KRW</span>
                    <div className="font-bold text-base">{fKrw(totKrw, 1)}</div>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-400">환율 ₩/€</span>
                  <div>
                    <input
                      type="number" value={exchangeRate} min="1" step="1"
                      onChange={e => onExchangeRateChange(parseFloat(e.target.value) || 1700)}
                      className="w-20 border border-gray-200 rounded px-2 py-0.5 text-sm font-bold focus:outline-none focus:border-black"
                    />
                  </div>
                </div>
              </div>
              <button onClick={handlePrint}
                className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                인쇄 / PDF
              </button>
            </div>
          )}

          {/* 인쇄용 합계 */}
          {quoteItems.length > 0 && (
            <div className="hidden print:block px-8 py-4 border-t border-gray-200">
              <div className="flex justify-end gap-8">
                {(currency === "BOTH" || currency === "EUR") && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">합계 EUR</div>
                    <div className="font-bold text-base">{fEur(totEur)}</div>
                  </div>
                )}
                {(currency === "BOTH" || currency === "KRW") && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500">합계 KRW</div>
                    <div className="font-bold text-base">{fKrw(totKrw, 1)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Terms & Conditions (항상 표시, 인쇄 포함) ── */}
          <div className="px-5 py-6 border-t border-gray-100 bg-gray-50/60">
            <h4 className="text-[11px] font-bold text-gray-700 mb-3 tracking-wider uppercase">
              Terms &amp; Conditions
            </h4>
            <ol className="space-y-2">
              {TERMS.map((t, i) => (
                <li key={i} className="flex gap-2 text-[10px] text-gray-500 leading-relaxed">
                  <span className="font-semibold text-gray-600 flex-shrink-0">{i + 1}.</span>
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
      </div>
    </div>
  );
}
