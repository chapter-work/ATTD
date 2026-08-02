"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, Item, Quote } from "@/lib/supabase";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";
import CatalogTable from "@/app/components/CatalogTable";
import ItemModal from "@/app/components/ItemModal";
import QuoteBuilder from "@/app/components/QuoteBuilder";
import SavedQuotes from "@/app/components/SavedQuotes";

type Tab = "catalog" | "quotes";
type SyncStatus = "online" | "offline" | "syncing";

export default function Home() {
  const [tab, setTab] = useState<Tab>("catalog");
  const [items, setItems] = useState<Item[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("offline");
  const [exchangeRate, setExchangeRate] = useState(1700);

  // 검색 / 필터
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterCat, setFilterCat] = useState("");

  // 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // 견적서
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  // ── 데이터 로드 ──────────────────────────────────────
  const loadItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("items").select("*").order("brand").order("model");
    if (!error && data) setItems(data as Item[]);
  }, []);

  const loadQuotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("quotes").select("*").order("created_at", { ascending: false });
    if (!error && data) setQuotes(data as Quote[]);
  }, []);

  useEffect(() => {
    setSyncStatus("syncing");
    Promise.all([loadItems(), loadQuotes()]).then(() => setSyncStatus("online")).catch(() => setSyncStatus("offline"));

    // Realtime
    const channel = supabase
      .channel("attd-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => {
        setSyncStatus("syncing");
        loadItems().then(() => setSyncStatus("online"));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => {
        setSyncStatus("syncing");
        loadQuotes().then(() => setSyncStatus("online"));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadItems, loadQuotes]);

  // ── 품목 CRUD ─────────────────────────────────────────
  const handleSaveItem = async (data: Partial<Item>, imgFile?: File | null) => {
    let imgData = editingItem?.img || null;

    // 이미지: base64로 저장 (현재 방식 유지, Supabase Storage 업그레이드 가능)
    if (imgFile) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => { imgData = e.target?.result as string; resolve(); };
        reader.readAsDataURL(imgFile);
      });
    }

    const payload = { ...data, img: imgData, updated_at: new Date().toISOString() };

    if (editingItem) {
      await supabase.from("items").update(payload).eq("id", editingItem.id);
    } else {
      await supabase.from("items").insert([payload]);
    }
    await loadItems();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("이 품목을 삭제하시겠습니까?")) return;
    await supabase.from("items").delete().eq("id", id);
    await loadItems();
  };

  // ── 견적서 CRUD ───────────────────────────────────────
  const handleSaveQuote = async (quoteData: Partial<Quote>) => {
    const payload = { ...quoteData, updated_at: new Date().toISOString() };
    if (editingQuote?.id) {
      await supabase.from("quotes").update(payload).eq("id", editingQuote.id);
    } else {
      await supabase.from("quotes").insert([payload]);
    }
    await loadQuotes();
    alert("견적서가 저장되었습니다");
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm("이 견적서를 삭제하시겠습니까?")) return;
    await supabase.from("quotes").delete().eq("id", id);
    await loadQuotes();
    if (editingQuote?.id === id) setEditingQuote(null);
  };

  // ── 필터 ─────────────────────────────────────────────
  const brands = [...new Set(items.map(i => i.brand))].sort();
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();

  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.brand.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q) || item.code?.toLowerCase().includes(q);
    const matchBrand = !filterBrand || item.brand === filterBrand;
    const matchCat = !filterCat || item.category === filterCat;
    return matchSearch && matchBrand && matchCat;
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        activeTab={tab}
        onTabChange={setTab}
        syncStatus={syncStatus}
        onAddItem={() => { setEditingItem(null); setModalOpen(true); }}
      />

      <main className="flex-1 overflow-hidden">
        {/* ── 카탈로그 ── */}
        <div className={`h-full flex flex-col ${tab === "catalog" ? "" : "hidden"}`}>
          {/* 검색/필터 바 */}
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex flex-wrap gap-2 no-print">
            <div className="relative flex-1 min-w-[160px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="브랜드, 모델, 코드 검색..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-black transition-colors"
              />
            </div>
            <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black bg-white">
              <option value="">전체 브랜드</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black bg-white">
              <option value="">전체 카테고리</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-xs text-gray-400 self-center">{filteredItems.length}개</span>
          </div>

          {/* 테이블 */}
          <div className="flex-1 overflow-auto">
            <CatalogTable
              items={filteredItems}
              exchangeRate={exchangeRate}
              onEdit={(item) => { setEditingItem(item); setModalOpen(true); }}
              onDelete={handleDeleteItem}
            />
          </div>
        </div>

        {/* ── 견적서 ── */}
        <div className={`h-full overflow-auto p-4 pb-24 lg:pb-4 ${tab === "quotes" ? "" : "hidden"}`}>
          <div className="flex flex-col lg:flex-row gap-4">
            <QuoteBuilder
              items={items}
              exchangeRate={exchangeRate}
              onExchangeRateChange={setExchangeRate}
              onSave={handleSaveQuote}
              editingQuote={editingQuote}
              onNewQuote={() => setEditingQuote(null)}
            />
            <SavedQuotes
              quotes={quotes}
              onLoad={setEditingQuote}
              onDelete={handleDeleteQuote}
            />
          </div>
        </div>
      </main>

      {/* 모바일 하단 탭 */}
      <BottomNav activeTab={tab} onTabChange={setTab} />

      {/* 품목 등록/수정 모달 */}
      <ItemModal
        open={modalOpen}
        item={editingItem}
        onClose={() => { setModalOpen(false); setEditingItem(null); }}
        onSave={handleSaveItem}
      />
    </div>
  );
}
