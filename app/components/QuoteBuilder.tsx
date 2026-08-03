"use client";

import { useState, useEffect } from "react";
import { Item, Quote, QuoteItem, fEur, fKrw, discountedPrice } from "@/lib/supabase";
import SavedQuotes from "@/app/components/SavedQuotes";

interface QuoteBuilderProps {
  items: Item[];
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
  onSave: (quote: Partial<Quote>) => Promise<void>;
  editingQuote?: Quote | null;
  onNewQuote: () => void;
  quotes: Quote[];
  onLoadQuote: (q: Quote) => void;
  onDeleteQuote: (id: string) => void;
}

export default function QuoteBuilder({
  items, exchangeRate, onExchangeRateChange,
  onSave, editingQuote, onNewQuote,
  quotes, onLoadQuote, onDeleteQuote,
}: QuoteBuilderProps) {
  // ── 폼 상태 ──────────────────────────────────────────
  const [title, setTitle]         = useState("");
  const [client, setClient]       = useState("");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency]   = useState<"BOTH" | "EUR" | "KRW">("BOTH");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [saving, setSaving]       = useState(false);

  // ── 상품 검색 모달 ────────────────────────────────────
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  // ── editingQuote 동기화 ───────────────────────────────
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

  // ── 상품 조작 ─────────────────────────────────────────
  const filteredPicker = items.filter(i => {
    const q = pickerSearch.toLowerCase();
    return !q || i.brand.toLowerCase().includes(q) ||
      i.model.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q);
  });

  const addItem = (item: Item) => {
    const exists = quoteItems.find(qi => qi.itemId === item.id);
    if (exists) {
      setQuoteItems(prev => prev.map(qi =>
        qi.itemId === item.id ? { ...qi, qty: qi.qty + 1 } : qi
      ));
    } else {
      setQuoteItems(prev => [...prev, {
        itemId: item.id, qty: 1, discount: item.discount, snap: item
      }]);
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

  // ── 합계 ─────────────────────────────────────────────
  const totEur = quoteItems.reduce(
    (s, qi) => s + discountedPrice(qi.snap.price_eur, qi.discount) * qi.qty, 0
  );
  const totKrw = totEur * exchangeRate;

  // ── 저장 ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { alert("견적서 제목을 입력해주세요"); return; }
    setSaving(true);
    try {
      await onSave({
        title, client, quote_date: quoteDate,
        currency, exchange_rate: exchangeRate, items: quoteItems,
      });
      // 저장 완료 후 내부 상태 직접 초기화 (editingQuote가 null→null이면 useEffect 미실행)
      setTitle(""); setClient("");
      setQuoteDate(new Date().toISOString().slice(0, 10));
      setCurrency("BOTH"); setQuoteItems([]);
      onNewQuote(); // 부모 editingOrder도 null로
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto bg-gray-50">

      {/* ════════════════════════════════════════
          섹션 1: 새 견적서 작성
          ════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        {/* 제목 행 */}
        <div className="flex items-center gap-2 mb-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="견적서 제목"
            className="flex-1 min-w-0 font-semibold text-sm border-0 border-b-2 border-gray-100
                       focus:border-black focus:outline-none py-1 transition-colors bg-transparent"
          />
          <button
            onClick={onNewQuote}
            className="flex-shrink-0 px-3 py-1.5 border border-gray-200 text-xs font-medium
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            초기화
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-shrink-0 px-3 py-1.5 bg-black text-white text-xs font-semibold
                       rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>

        {/* 기본 정보 행 */}
        <div className="flex flex-wrap gap-2">
          <input
            value={client}
            onChange={e => setClient(e.target.value)}
            placeholder="고객사명"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs
                       focus:outline-none focus:border-black"
          />
          <input
            type="date"
            value={quoteDate}
            onChange={e => setQuoteDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs
                       focus:outline-none focus:border-black"
          />
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value as "BOTH" | "EUR" | "KRW")}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs
                       focus:outline-none focus:border-black bg-white"
          >
            <option value="BOTH">EUR + KRW</option>
            <option value="EUR">EUR만</option>
            <option value="KRW">KRW만</option>
          </select>
          {(currency === "BOTH" || currency === "KRW") && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">₩/€</span>
              <input
                type="number"
                value={exchangeRate}
                min="1"
                step="1"
                onChange={e => onExchangeRateChange(parseFloat(e.target.value) || 1700)}
                className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs
                           font-semibold focus:outline-none focus:border-black"
              />
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          섹션 2: 상품 검색 버튼 + 선택된 품목 목록
          ════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        {/* 상품 검색 버튼 */}
        <button
          onClick={() => { setPickerSearch(""); setPickerOpen(true); }}
          className="w-full flex items-center justify-between px-4 py-3 border-2 border-dashed
                     border-gray-200 rounded-xl hover:border-black hover:bg-gray-50
                     transition-colors group"
        >
          <div className="flex items-center gap-2 text-gray-400 group-hover:text-black">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span className="text-sm font-medium">상품 검색하여 추가</span>
          </div>
          <span className="text-xs text-gray-300 group-hover:text-gray-500">
            {quoteItems.length > 0 ? `${quoteItems.length}개 선택됨` : ""}
          </span>
        </button>

        {/* 선택된 품목 목록 */}
        {quoteItems.length > 0 && (
          <div className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] text-gray-400 font-medium">
                    <th className="pb-1.5 text-left w-7">No.</th>
                    <th className="pb-1.5" style={{width:"52px", minWidth:"52px"}}></th>
                    <th className="pb-1.5 text-left">브랜드 / 모델</th>
                    <th className="pb-1.5 text-left w-24">피니쉬</th>
                    <th className="pb-1.5 text-right w-28">단가(판매가)</th>
                    <th className="pb-1.5 text-center w-20">수량</th>
                    <th className="pb-1.5 text-right w-28">합계</th>
                    <th className="pb-1.5 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {quoteItems.map((qi, i) => {
                    const unit  = discountedPrice(qi.snap.price_eur, qi.discount);
                    const total = unit * qi.qty;
                    return (
                      <tr key={qi.itemId} className="border-b border-gray-50">
                        <td className="py-2 text-gray-300 text-[10px]">{i + 1}</td>
                        <td className="py-2 pr-1" style={{width:"52px", minWidth:"52px"}}>
                          {qi.snap.img
                            ? <img src={qi.snap.img} alt={qi.snap.model} style={{width:"44px", height:"44px", objectFit:"contain", borderRadius:"4px", background:"#fafafa", padding:"2px", display:"block"}} />
                            : <div style={{width:"44px", height:"44px", background:"#f3f4f6", borderRadius:"4px"}} />}
                        </td>
                        <td className="py-2">
                          <div className="text-[10px] text-gray-400 font-semibold">{qi.snap.brand}</div>
                          <div className="text-xs font-semibold text-black">{qi.snap.model}</div>
                        </td>
                        <td className="py-2 text-left">
                          <div className="text-[10px] text-gray-500">{qi.snap.finish || "—"}</div>
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          {(currency === "BOTH" || currency === "EUR") && (
                            <div className="text-xs font-semibold text-gray-700">{fEur(unit)}</div>
                          )}
                          {(currency === "BOTH" || currency === "KRW") && (
                            <div className="text-[10px] text-gray-400">{fKrw(unit, exchangeRate)}</div>
                          )}
                        </td>
                        <td className="py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => updateQty(qi.itemId, qi.qty - 1)}
                              className="w-6 h-6 border border-gray-200 rounded text-xs hover:bg-gray-100"
                            >-</button>
                            <span className="w-5 text-center text-xs font-bold">{qi.qty}</span>
                            <button
                              onClick={() => updateQty(qi.itemId, qi.qty + 1)}
                              className="w-6 h-6 border border-gray-200 rounded text-xs hover:bg-gray-100"
                            >+</button>
                          </div>
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          {(currency === "BOTH" || currency === "EUR") && (
                            <div className="font-bold text-xs">{fEur(total)}</div>
                          )}
                          {(currency === "BOTH" || currency === "KRW") && (
                            <div className="text-[10px] text-gray-400">{fKrw(total, exchangeRate)}</div>
                          )}
                        </td>
                        <td className="py-2 pl-1">
                          <button
                            onClick={() => removeItem(qi.itemId)}
                            className="w-6 h-6 flex items-center justify-center rounded border border-gray-200
                                       text-gray-300 hover:border-red-300 hover:text-red-400 hover:bg-red-50
                                       transition-colors"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

            {/* 합계 */}
            <div className="mt-2 pt-2 border-t-2 border-black flex items-center justify-end gap-6">
              {(currency === "BOTH" || currency === "EUR") && (
                <div className="text-right">
                  <div className="text-[10px] text-gray-400">합계</div>
                  <div className="font-bold text-sm">{fEur(totEur)}</div>
                </div>
              )}
              {(currency === "BOTH" || currency === "KRW") && (
                <div className="text-right">
                  <div className="text-[10px] text-gray-400">합계</div>
                  <div className="font-bold text-sm">{fKrw(totKrw, 1)}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════
          섹션 3: 저장된 견적서 목록
          ════════════════════════════════════════ */}
      <div className="flex-1">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 tracking-wide uppercase">저장된 견적서</span>
          <span className="text-[10px] text-gray-400">{quotes.length}건</span>
        </div>
        <SavedQuotes
          quotes={quotes}
          onLoad={(q) => { onLoadQuote(q); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          onDelete={onDeleteQuote}
          compact
        />
      </div>

      {/* ════════════════════════════════════════
          상품 검색 모달
          ════════════════════════════════════════ */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* 딤 배경 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPickerOpen(false)}
          />

          {/* 모달 패널 */}
          <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl
                          shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "80dvh" }}>

            {/* 헤더 */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-bold">상품 검색</span>
              <button
                onClick={() => setPickerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full
                           text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* 검색 입력 */}
            <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="브랜드, 모델, 코드 검색..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg
                             focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* 상품 목록 */}
            <div className="flex-1 overflow-y-auto">
              {filteredPicker.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <svg className="text-gray-200 mb-2" width="28" height="28" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <p className="text-xs text-gray-400">
                    {pickerSearch ? `"${pickerSearch}" 검색 결과 없음` : "등록된 품목이 없습니다"}
                  </p>
                  {pickerSearch && (
                    <button
                      onClick={() => setPickerSearch("")}
                      className="mt-2 text-[10px] text-gray-400 underline"
                    >
                      검색 초기화
                    </button>
                  )}
                </div>
              ) : (
                filteredPicker.map(item => {
                  const dp      = discountedPrice(item.price_eur, item.discount);
                  const isAdded = quoteItems.some(qi => qi.itemId === item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => addItem(item)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3
                                  border-b border-gray-50 hover:bg-gray-50 transition-colors
                                  ${isAdded ? "bg-green-50/60" : ""}`}
                    >
                      {item.img
                        ? <img src={item.img} alt={item.model}
                            style={{width:"48px", height:"48px", objectFit:"contain", borderRadius:"6px", background:"#fafafa", padding:"3px", flexShrink:0, display:"block"}} />
                        : <div style={{width:"48px", height:"48px", background:"#f3f4f6", borderRadius:"6px", flexShrink:0}} />}
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold text-gray-400">{item.brand}</div>
                        <div className="text-xs font-semibold text-black truncate">{item.model}</div>
                        <div className="text-[10px] font-bold text-black">{fEur(dp)}</div>
                      </div>
                      {isAdded
                        ? <span className="text-[10px] text-green-600 font-bold flex-shrink-0">✓ 추가됨</span>
                        : <span className="text-[10px] text-gray-300 flex-shrink-0">추가</span>}
                    </button>
                  );
                })
              )}
            </div>

            {/* 하단 확인 버튼 */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
              <button
                onClick={() => setPickerOpen(false)}
                className="w-full py-2.5 bg-black text-white text-sm font-semibold
                           rounded-xl hover:bg-gray-800 transition-colors"
              >
                완료 {quoteItems.length > 0 ? `(${quoteItems.length}개)` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
