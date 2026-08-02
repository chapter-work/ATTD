"use client";

import { Item, fEur, fKrw, discountedPrice } from "@/lib/supabase";

interface CatalogTableProps {
  items: Item[];
  exchangeRate: number;
  onEdit: (item: Item) => void;
  onDelete: (id: string) => void;
}

export default function CatalogTable({ items, exchangeRate, onEdit, onDelete }: CatalogTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <div className="w-12 h-12 border-2 border-gray-200 rounded mb-3" />
        <p className="font-medium text-gray-500">등록된 품목이 없습니다</p>
        <p className="text-sm mt-1">상단의 <strong>+ 품목</strong>을 눌러 등록하세요</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#111] text-white text-xs">
            <th className="w-16 px-2 py-3 text-left font-medium">사진</th>
            <th className="px-3 py-3 text-left font-medium whitespace-nowrap">브랜드</th>
            <th className="px-3 py-3 text-left font-medium whitespace-nowrap">모델명 / 코드</th>
            <th className="px-3 py-3 text-left font-medium whitespace-nowrap">카테고리</th>
            <th className="px-3 py-3 text-left font-medium">치수</th>
            <th className="px-3 py-3 text-left font-medium">피니쉬 / 소재</th>
            <th className="px-3 py-3 text-right font-medium whitespace-nowrap">단가</th>
            <th className="px-3 py-3 text-center font-medium whitespace-nowrap">할인율</th>
            <th className="px-3 py-3 text-right font-medium whitespace-nowrap">할인가</th>
            <th className="px-2 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const dp = discountedPrice(item.price_eur, item.discount);
            return (
              <tr
                key={item.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                {/* 사진 */}
                <td className="px-2 py-2">
                  {item.img ? (
                    <img
                      src={item.img}
                      alt={item.model}
                      className="w-12 h-12 object-cover rounded border border-gray-100"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                      <span className="text-gray-300 text-xs">NO IMG</span>
                    </div>
                  )}
                </td>

                {/* 브랜드 */}
                <td className="px-3 py-2">
                  <span className="inline-block bg-black text-white text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap">
                    {item.brand}
                  </span>
                </td>

                {/* 모델명 / 코드 */}
                <td className="px-3 py-2 min-w-[140px]">
                  <div className="font-semibold text-black leading-tight">{item.model}</div>
                  {item.code && (
                    <div className="text-[10px] text-gray-400 mt-0.5">{item.code}</div>
                  )}
                </td>

                {/* 카테고리 */}
                <td className="px-3 py-2">
                  {item.category && (
                    <span className="inline-block border border-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded whitespace-nowrap">
                      {item.category}
                    </span>
                  )}
                </td>

                {/* 치수 */}
                <td className="px-3 py-2 text-xs text-gray-600 min-w-[100px] whitespace-pre-line">
                  {item.dims}
                </td>

                {/* 피니쉬 */}
                <td className="px-3 py-2 text-xs text-gray-600 max-w-[180px] whitespace-pre-line">
                  {item.finish}
                </td>

                {/* 단가 (EUR + KRW 한 셀) */}
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <div className="font-bold text-black">{fEur(item.price_eur)}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{fKrw(item.price_eur, exchangeRate)}</div>
                </td>

                {/* 할인율 */}
                <td className="px-3 py-2 text-center">
                  {item.discount > 0 ? (
                    <span className="inline-block bg-[#111] text-white text-[10px] font-bold px-2 py-1 rounded">
                      {item.discount}%
                    </span>
                  ) : (
                    <span className="inline-block bg-gray-100 text-gray-400 text-[10px] font-bold px-2 py-1 rounded">
                      0%
                    </span>
                  )}
                </td>

                {/* 할인가 (EUR + KRW 한 셀) */}
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <div className="font-bold text-black">{fEur(dp)}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{fKrw(dp, exchangeRate)}</div>
                </td>

                {/* 액션 */}
                <td className="px-2 py-2 whitespace-nowrap">
                  <button
                    onClick={() => onEdit(item)}
                    className="text-xs text-gray-500 hover:text-black px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-xs text-gray-300 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
