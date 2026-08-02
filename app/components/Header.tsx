"use client";

type Tab = "catalog" | "quotes";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  syncStatus: "online" | "offline" | "syncing";
  onAddItem?: () => void;
}

export default function Header({ activeTab, onTabChange, syncStatus, onAddItem }: HeaderProps) {
  const statusColor =
    syncStatus === "online" ? "bg-green-400" :
    syncStatus === "syncing" ? "bg-yellow-400 animate-pulse" :
    "bg-red-400";

  const statusText =
    syncStatus === "online" ? "동기화됨" :
    syncStatus === "syncing" ? "동기화 중..." :
    "오프라인";

  return (
    <header className="bg-[#111] text-white sticky top-0 z-40 safe-top">
      <div className="flex items-center justify-between px-4 h-12">
        {/* 로고 */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-widest">ATTD</span>
          <span className={`w-2 h-2 rounded-full ${statusColor}`} title={statusText} />
          <span className="text-[10px] text-white/40 hidden sm:inline">{statusText}</span>
        </div>

        {/* PC 탭 (sm 이상) */}
        <nav className="hidden sm:flex gap-1">
          <button
            onClick={() => onTabChange("catalog")}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === "catalog"
                ? "bg-white text-black"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            카탈로그
          </button>
          <button
            onClick={() => onTabChange("quotes")}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === "quotes"
                ? "bg-white text-black"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            견적서
          </button>
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
        </div>
      </div>

      {/* 모바일 하단 탭바는 별도 컴포넌트 */}
    </header>
  );
}
