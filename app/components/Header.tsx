"use client";

type Tab = "catalog" | "projects" | "customer_quotes" | "orders";

interface HeaderProps {
  syncStatus: "online" | "offline" | "syncing";
}

export default function Header({ syncStatus }: HeaderProps) {
  const statusColor =
    syncStatus === "online"   ? "bg-green-400" :
    syncStatus === "syncing"  ? "bg-yellow-400 animate-pulse" :
    "bg-red-400";

  const statusText =
    syncStatus === "online"   ? "동기화됨" :
    syncStatus === "syncing"  ? "동기화 중..." :
    "오프라인";

  return (
    <header
      className="no-print bg-[#111] text-white sticky top-0 z-40"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex items-center px-4 h-11">
        <button
          onClick={() => window.location.reload()}
          className="font-bold text-base tracking-widest hover:opacity-70 transition-opacity"
        >
          ATTD
        </button>
        <span className={`ml-2 w-2 h-2 rounded-full ${statusColor}`} title={statusText} />
        <span className="ml-1.5 text-[10px] text-white/40 hidden sm:inline">{statusText}</span>
      </div>
    </header>
  );
}

// ── SubHeader: 탭 + 액션 버튼 ──────────────────────────────
interface SubHeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onAddItem?: () => void;
  onNewProject?: () => void;
  onNewOrder?: () => void;
}

export function SubHeader({
  activeTab, onTabChange,
  onAddItem, onNewProject, onNewOrder,
}: SubHeaderProps) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "catalog",         label: "상품관리" },
    { key: "projects",        label: "프로젝트" },
    { key: "customer_quotes", label: "고객견적서" },
    { key: "orders",          label: "발주서" },
  ];

  return (
    <div className="no-print bg-white border-b border-gray-200 sticky top-11 z-30 flex items-center justify-between px-4 h-10">
      {/* 탭 */}
      <nav className="flex items-center gap-0.5 h-full">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`h-full px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-black text-black"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2">
        {activeTab === "catalog" && onAddItem && (
          <button
            onClick={onAddItem}
            className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded hover:bg-gray-800 transition-colors"
          >
            <span className="text-sm leading-none">+</span> 품목
          </button>
        )}
        {activeTab === "projects" && onNewProject && (
          <button
            onClick={onNewProject}
            className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded hover:bg-gray-800 transition-colors"
          >
            <span className="text-sm leading-none">+</span> 프로젝트
          </button>
        )}
        {activeTab === "orders" && onNewOrder && (
          <button
            onClick={onNewOrder}
            className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded hover:bg-gray-800 transition-colors"
          >
            <span className="text-sm leading-none">+</span> 발주서
          </button>
        )}
      </div>
    </div>
  );
}
