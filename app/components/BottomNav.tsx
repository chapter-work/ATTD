"use client";

type Tab = "catalog" | "projects" | "quotes";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="no-print sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
      <div className="flex">
        {/* 상품관리 */}
        <button
          onClick={() => onTabChange("catalog")}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
            activeTab === "catalog" ? "text-black" : "text-gray-400"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          상품관리
        </button>

        {/* 내부 프로젝트 */}
        <button
          onClick={() => onTabChange("projects")}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
            activeTab === "projects" ? "text-black" : "text-gray-400"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <line x1="9" y1="14" x2="15" y2="14"/>
          </svg>
          프로젝트
        </button>

        {/* 고객 견적서 */}
        <button
          onClick={() => onTabChange("quotes")}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
            activeTab === "quotes" ? "text-black" : "text-gray-400"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          견적서
        </button>
      </div>
    </nav>
  );
}
