"use client";

import { Project, calcProjectSummary, fKrwFull } from "@/lib/supabase";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft:     { label: "작업중",   cls: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "확정",    cls: "bg-blue-100 text-blue-700" },
  completed: { label: "완료",    cls: "bg-green-100 text-green-700" },
};

interface ProjectListProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (p: Project) => void;
  onDelete: (id: string) => void;
}

export default function ProjectList({ projects, selectedId, onSelect, onDelete }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" className="mb-4">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
          <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
        <p className="text-sm text-gray-400 font-medium">프로젝트가 없습니다</p>
        <p className="text-xs text-gray-300 mt-1">우측 상단 + 프로젝트를 눌러 시작하세요</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {projects.map((p) => {
        const s = calcProjectSummary(p.items, p.exchange_rate);
        const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.draft;
        const isSelected = p.id === selectedId;

        return (
          <div
            key={p.id}
            onClick={() => onSelect(p)}
            className={`group flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 ${
              isSelected ? "bg-blue-50 border-l-2 border-blue-500" : ""
            }`}
          >
            {/* 상태 컬러 도트 */}
            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
              p.status === "completed" ? "bg-green-400" :
              p.status === "confirmed" ? "bg-blue-400" : "bg-yellow-400"
            }`} />

            {/* 본문 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900 truncate">{p.title}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                {p.client && <span>{p.client}</span>}
                <span className="text-gray-300">·</span>
                <span>{p.project_date}</span>
                <span className="text-gray-300">·</span>
                <span>{p.items.length}종 {s.item_count}개</span>
              </div>
              {/* 금액 요약 */}
              {p.items.length > 0 && (
                <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                  <span className="text-gray-400">
                    판매가 <span className="font-semibold text-gray-700">{fKrwFull(s.total_sell)}</span>
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className={`font-semibold ${s.total_profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    이익 {fKrwFull(s.total_profit)}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-500">마진 {s.avg_margin.toFixed(1)}%</span>
                </div>
              )}
            </div>

            {/* 삭제 버튼 */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
              className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 text-gray-300 hover:text-red-400 transition-all"
              title="삭제"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
