"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Area = {
  id: string;
  name: string;
  slug: string;
  prefecture: string;
  sort_order: number;
  description: string | null;
  image_url: string | null;
};

type EditForm = {
  name: string;
  slug: string;
  prefecture: string;
  sort_order: string;
  description: string;
  image_url: string;
};

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-gray-900 px-5 py-3 text-sm text-white shadow-lg">
      {message}
    </div>
  );
}

// ── AdminAreasPage ────────────────────────────────────────────────────────────

export default function AdminAreasPage() {
  const [areas, setAreas]         = useState<Area[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<EditForm>({
    name: "", slug: "", prefecture: "", sort_order: "0", description: "", image_url: "",
  });
  const [saving, setSaving]       = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function loadAreas() {
    const { data } = await supabase
      .from("areas")
      .select("id, name, slug, prefecture, sort_order, description, image_url")
      .order("sort_order", { ascending: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setAreas((data ?? []).map((a: any) => ({
      id:          a.id,
      name:        a.name,
      slug:        a.slug,
      prefecture:  a.prefecture ?? "",
      sort_order:  a.sort_order ?? 0,
      description: a.description ?? null,
      image_url:   a.image_url ?? null,
    })));
    setLoading(false);
  }

  useEffect(() => { loadAreas(); }, []);

  // ── Edit ─────────────────────────────────────────────────────────────────────

  function startEdit(area: Area) {
    setEditingId(area.id);
    setEditForm({
      name:        area.name,
      slug:        area.slug,
      prefecture:  area.prefecture,
      sort_order:  String(area.sort_order),
      description: area.description ?? "",
      image_url:   area.image_url ?? "",
    });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleSave(id: string) {
    const name = editForm.name.trim();
    if (!name) { setEditError("エリア名を入力してください"); return; }
    const slug = editForm.slug.trim();
    if (!slug) { setEditError("slugを入力してください"); return; }

    setSaving(true);
    const { error } = await supabase
      .from("areas")
      .update({
        name,
        slug,
        prefecture:  editForm.prefecture.trim(),
        sort_order:  parseInt(editForm.sort_order, 10) || 0,
        description: editForm.description.trim() || null,
        image_url:   editForm.image_url.trim() || null,
      })
      .eq("id", id);

    if (error) {
      setEditError("保存に失敗しました：" + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditingId(null);
    setToast("エリア情報を更新しました");
    await loadAreas();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <h1 className="text-2xl font-bold text-gray-900">エリア管理</h1>

      {loading && (
        <div className="text-sm text-gray-400 py-8 text-center">読み込み中...</div>
      )}

      {!loading && areas.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-400">エリアが登録されていません</p>
        </div>
      )}

      {!loading && areas.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
          {areas.map((area) => {
            const isEditing = editingId === area.id;

            if (isEditing) {
              return (
                <div key={area.id} className="bg-amber-50 px-6 py-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">
                        エリア名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => { setEditForm(f => ({ ...f, name: e.target.value })); setEditError(null); }}
                        className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">
                        slug <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.slug}
                        onChange={e => { setEditForm(f => ({ ...f, slug: e.target.value })); setEditError(null); }}
                        className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-mono focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">都道府県</label>
                      <input
                        type="text"
                        value={editForm.prefecture}
                        onChange={e => setEditForm(f => ({ ...f, prefecture: e.target.value }))}
                        className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500">表示順</label>
                      <input
                        type="number"
                        value={editForm.sort_order}
                        onChange={e => setEditForm(f => ({ ...f, sort_order: e.target.value }))}
                        className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">画像URL</label>
                    <input
                      type="url"
                      value={editForm.image_url}
                      onChange={e => setEditForm(f => ({ ...f, image_url: e.target.value }))}
                      placeholder="https://images.unsplash.com/... または Cloudinary URL"
                      className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">説明文（SEO用）</label>
                    <textarea
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      rows={4}
                      placeholder="エリアの特徴や魅力を記載してください（150〜300文字程度）"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                    />
                    <p className="text-xs text-gray-400 text-right">
                      {editForm.description.length} 文字
                    </p>
                  </div>
                  {editError && <p className="text-xs text-red-600">{editError}</p>}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave(area.id)}
                      disabled={saving}
                      className="rounded-lg bg-[#1B4332] px-5 py-2 text-xs font-medium text-white hover:bg-[#2D6A4F] transition-colors disabled:opacity-50"
                    >
                      {saving ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={area.id}
                className="flex items-start justify-between px-6 py-4 hover:bg-gray-50 transition-colors gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{area.name}</p>
                    <span className="text-xs font-mono text-gray-400">{area.slug}</span>
                    <span className="text-xs text-gray-400">{area.prefecture}</span>
                    <span className="text-xs text-gray-400">順{area.sort_order}</span>
                  </div>
                  {area.description ? (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                      {area.description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-300 italic">説明文未設定</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(area)}
                  className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  編集
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
