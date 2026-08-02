"use client";

type Tab = "catalog" | "projects" | "quotes";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  syncStatus: "online" | "offline" | "syncing";
  onAddItem?: () => void;
  onNewProject?: () => void;
}

export default function Header({ activeTab, onTabChange, syncStatus, onAddItem, onNewProject }: HeaderProps) {
  const statusColor =
    syncStatus === "online" ? "bg-green-400" :
    syncStatus === "syncing" ? "bg-yellow-400 animate-pulse" :
    "bg-red-400";

  const statusText =
    syncStatus === "online" ? "동기화됨" :
    syncStatus === "syncing" ? "동기화 중..." :
    "오프라인";

  const tabs: { key: Tab; label: string }[] = [
    { key: "catalog",  label: "상품관리" },
    { key: "projects", label: "내부 프로젝트" },
    { key: "quotes",   label: "고객 견적서" },
  ];

  return (
    <header className="no-print bg-[#111] text-white sticky top-0 z-40" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="flex items-center justify-between px-4 h-12">
        {/* 로고 */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-widest">ATTD</span>
          <span className={`w-2 h-2 rounded-full ${statusColor}`} title={statusText} />
          <span className="text-[10px] text-white/40 hidden sm:inline">{statusText}</span>
        </div>

        {/* PC 탭 (sm 이상) */}
        <nav className="hidden sm:flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "bg-white text-black"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* 우측 액션 */}
        <div className="flex items-center gap-2">
          {activeTab === "catalog" && onAddItem && (
            <button
              onClick={onAddItem}
              className="flex items-center gap-1 px-3 py-1.5 bg-white text-black text-xs font-semibold rounded hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm">+</span> 품목
            </button>
          )}
          {activeTab === "projects" && onNewProject && (
            <button
              onClick={onNewProject}
              className="flex items-center gap-1 px-3 py-1.5 bg-white text-black text-xs font-semibold rounded hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm">+</span> 프로젝트
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
