"use client";

type Tab = "catalog" | "quotes";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="no-print sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
      <div className="flex">
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
          카탈로그
        </button>
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
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          견적서
        </button>
      </div>
    </nav>
  );
}
