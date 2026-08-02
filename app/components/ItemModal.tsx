"use client";

import { useState, useEffect, useRef } from "react";
import { Item } from "@/lib/supabase";

interface ItemModalProps {
  open: boolean;
  item?: Item | null;
  onClose: () => void;
  onSave: (data: Partial<Item>, imgFile?: File | null) => Promise<void>;
}

const CATEGORIES = ["Sofa", "Chair", "Armchair", "Lounge Chair", "Table", "Desk",
  "Cabinet", "Shelf", "Bed", "Lighting", "Rug", "Mirror", "Tableware", "Wallpaper", "Other"];

export default function ItemModal({ open, item, onClose, onSave }: ItemModalProps) {
  const [form, setForm] = useState({
    brand: "", category: "", model: "", code: "",
    dims: "", finish: "", price_eur: "", discount: "", notes: "",
  });
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (item) {
        setForm({
          brand: item.brand || "",
          category: item.category || "",
          model: item.model || "",
          code: item.code || "",
          dims: item.dims || "",
          finish: item.finish || "",
          price_eur: String(item.price_eur || ""),
          discount: String(item.discount || ""),
          notes: item.notes || "",
        });
        setImgPreview(item.img || null);
      } else {
        setForm({ brand:"", category:"", model:"", code:"", dims:"", finish:"", price_eur:"", discount:"", notes:"" });
        setImgPreview(null);
      }
      setImgFile(null);
    }
  }, [open, item]);

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.brand.trim() || !form.model.trim()) return;
    setSaving(true);
    try {
      await onSave({
        brand: form.brand.trim(),
        category: form.category,
        model: form.model.trim(),
        code: form.code.trim(),
        dims: form.dims.trim(),
        finish: form.finish.trim(),
        price_eur: parseFloat(form.price_eur) || 0,
        discount: parseFloat(form.discount) || 0,
        notes: form.notes.trim(),
      }, imgFile);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-base">{item ? "품목 수정" : "품목 등록"}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black rounded-full hover:bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* 이미지 업로드 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">사진</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-full h-36 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden"
            >
              {imgPreview ? (
                <img src={imgPreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400">
                  <svg className="mx-auto mb-1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span className="text-xs">사진 업로드</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
          </div>

          {/* 브랜드 + 카테고리 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">브랜드 *</label>
              <input
                required value={form.brand}
                onChange={e => setForm(f => ({...f, brand: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                placeholder="예: CASSINA"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">카테고리</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors bg-white"
              >
                <option value="">선택</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* 모델명 + 코드 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">모델명 *</label>
              <input
                required value={form.model}
                onChange={e => setForm(f => ({...f, model: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                placeholder="모델명"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">코드</label>
              <input
                value={form.code}
                onChange={e => setForm(f => ({...f, code: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                placeholder="COD. XXX"
              />
            </div>
          </div>

          {/* 치수 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">치수</label>
            <input
              value={form.dims}
              onChange={e => setForm(f => ({...f, dims: e.target.value}))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
              placeholder="W.100 × D.80 × H.75"
            />
          </div>

          {/* 피니쉬 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">피니쉬 / 소재</label>
            <textarea
              value={form.finish} rows={2}
              onChange={e => setForm(f => ({...f, finish: e.target.value}))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors resize-none"
              placeholder="FINISH: CLASSIC WALNUT"
            />
          </div>

          {/* 유럽 리테일가 + 할인율 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">유럽 리테일가 EUR *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                <input
                  type="number" min="0" step="0.01" value={form.price_eur}
                  onChange={e => setForm(f => ({...f, price_eur: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">할인율 %</label>
              <div className="relative">
                <input
                  type="number" min="0" max="100" step="0.1" value={form.discount}
                  onChange={e => setForm(f => ({...f, discount: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 pr-7 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* 비고 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">비고</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
              placeholder="단가 문의 필요 등"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2 pb-safe">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-black text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
              {saving ? "저장 중..." : item ? "수정 완료" : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
