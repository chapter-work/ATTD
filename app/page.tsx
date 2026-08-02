"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, Item, Quote, Project } from "@/lib/supabase";
import Header from "@/app/components/Header";
import BottomNav from "@/app/components/BottomNav";
import CatalogTable from "@/app/components/CatalogTable";
import ItemModal from "@/app/components/ItemModal";
import QuoteBuilder from "@/app/components/QuoteBuilder";
import SavedQuotes from "@/app/components/SavedQuotes";
import ProjectList from "@/app/components/ProjectList";
import ProjectDetail from "@/app/components/ProjectDetail";

type Tab = "catalog" | "projects" | "quotes";
type SyncStatus = "online" | "offline" | "syncing";

export default function Home() {
  const [tab, setTab] = useState<Tab>("catalog");
  const [items, setItems] = useState<Item[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
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

  // 프로젝트: selectedProject = null이면 목록, 아니면 해당 프로젝트 편집
  // "new" 문자열을 특수값으로 사용하여 신규 생성 구분
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDetail, setShowProjectDetail] = useState(false);

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

  const loadProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from("projects").select("*").order("created_at", { ascending: false });
    if (!error && data) setProjects(data as Project[]);
  }, []);

  useEffect(() => {
    setSyncStatus("syncing");
    Promise.all([loadItems(), loadQuotes(), loadProjects()])
      .then(() => setSyncStatus("online"))
      .catch(() => setSyncStatus("offline"));

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
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        setSyncStatus("syncing");
        loadProjects().then(() => setSyncStatus("online"));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadItems, loadQuotes, loadProjects]);

  // ── 품목 CRUD ─────────────────────────────────────────
  const handleSaveItem = async (data: Partial<Item>, imgFile?: File | null) => {
    let imgData = editingItem?.img || null;

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

  // ── 프로젝트 CRUD ─────────────────────────────────────
  const handleSaveProject = async (projectData: Partial<Project>) => {
    const payload = { ...projectData, updated_at: new Date().toISOString() };
    if (projectData.id) {
      const { error } = await supabase.from("projects").update(payload).eq("id", projectData.id);
      if (error) { alert("저장 오류: " + error.message); return; }
    } else {
      const { data, error } = await supabase.from("projects").insert([payload]).select().single();
      if (error) { alert("저장 오류: " + error.message); return; }
      if (data) setSelectedProject(data as Project);
    }
    await loadProjects();
    alert("프로젝트가 저장되었습니다");
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    await supabase.from("projects").delete().eq("id", id);
    await loadProjects();
    if (selectedProject?.id === id) {
      setSelectedProject(null);
      setShowProjectDetail(false);
    }
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
        onTabChange={(t) => {
          setTab(t);
          // 탭 이동 시 상세 뷰 닫기
          if (t !== "projects") setShowProjectDetail(false);
        }}
        syncStatus={syncStatus}
        onAddItem={() => { setEditingItem(null); setModalOpen(true); }}
        onNewProject={() => {
          setSelectedProject(null);
          setShowProjectDetail(true);
        }}
      />

      <main className="flex-1 overflow-hidden">

        {/* ── 상품관리 ── */}
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

          <div className="flex-1 overflow-auto">
            <CatalogTable
              items={filteredItems}
              exchangeRate={exchangeRate}
              onEdit={(item) => { setEditingItem(item); setModalOpen(true); }}
              onDelete={handleDeleteItem}
            />
          </div>
        </div>

        {/* ── 내부 프로젝트 ── */}
        <div className={`h-full flex overflow-hidden ${tab === "projects" ? "" : "hidden"}`}>
          {/* 목록 패널 (PC: 좌측 사이드바, 모바일: showProjectDetail일 때 숨김) */}
          <div className={`
            flex flex-col border-r border-gray-200 bg-white
            ${showProjectDetail ? "hidden lg:flex lg:w-72 xl:w-80 flex-shrink-0" : "flex-1 lg:w-72 xl:w-80 lg:flex-none"}
          `}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-gray-500 tracking-wide uppercase">프로젝트 목록</h2>
                <span className="text-[10px] text-gray-400">{projects.length}건</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pb-24 lg:pb-0">
              <ProjectList
                projects={projects}
                selectedId={selectedProject?.id ?? null}
                onSelect={(p) => {
                  setSelectedProject(p);
                  setShowProjectDetail(true);
                }}
                onDelete={handleDeleteProject}
              />
            </div>
          </div>

          {/* 상세 패널 */}
          {showProjectDetail ? (
            <div className="flex-1 overflow-hidden">
              <ProjectDetail
                project={selectedProject}
                items={items}
                onSave={handleSaveProject}
                onClose={() => {
                  setShowProjectDetail(false);
                  setSelectedProject(null);
                }}
              />
            </div>
          ) : (
            /* PC: 상세 없을 때 빈 영역 */
            <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50">
              <div className="text-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mx-auto mb-3">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <p className="text-sm text-gray-400">프로젝트를 선택하거나 새로 만드세요</p>
              </div>
            </div>
          )}
        </div>

        {/* ── 고객 견적서 ── */}
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
      <BottomNav activeTab={tab} onTabChange={(t) => {
        setTab(t);
        if (t !== "projects") setShowProjectDetail(false);
      }} />

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
