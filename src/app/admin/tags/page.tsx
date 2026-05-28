"use client";

import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "facility" | "theme" | "amenity";

type Tag = {
  id: string;
  name: string;
  slug: string;
  category: Category;
  sort_order: number;
  description: string | null;
  usageCount: number;
};

type EditForm = {
  name: string;
  slug: string;
  sort_order: string;
  description: string;
};

type AddForm = {
  name: string;
  slug: string;
  category: Category;
  sort_order: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "facility", label: "設備" },
  { value: "theme",    label: "テーマ" },
  { value: "amenity",  label: "アメニティ" },
];

const ADD_FORM_DEFAULT: AddForm = {
  name: "",
  slug: "",
  category: "facility",
  sort_order: "0",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  const ascii = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return ascii.length > 0 ? ascii : `tag-${Date.now().toString(36)}`;
}

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

// ── AdminTagsPage ─────────────────────────────────────────────────────────────

export default function AdminTagsPage() {
  const [tags, setTags]             = useState<Tag[]>([]);
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm]       = useState<AddForm>(ADD_FORM_DEFAULT);
  const [adding, setAdding]         = useState(false);
  const [addError, setAddError]     = useState<string | null>(null);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editForm, setEditForm]     = useState<EditForm>({ name: "", slug: "", sort_order: "0", description: "" });
  const [saving, setSaving]         = useState(false);
  const [editError, setEditError]   = useState<string | null>(null);

  async function loadTags() {
    const { data } = await supabase
      .from("tags")
      .select("id, name, slug, category, sort_order, description, facility_tags(facility_id)")
      .order("sort_order", { ascending: true });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTags((data ?? []).map((t: any) => ({
      id:          t.id,
      name:        t.name,
      slug:        t.slug,
      category:    t.category,
      sort_order:  t.sort_order ?? 0,
      description: t.description ?? null,
      usageCount:  Array.isArray(t.facility_tags) ? t.facility_tags.length : 0,
    })));
    setLoading(false);
  }

  useEffect(() => { loadTags(); }, []);

  // ── Add ──────────────────────────────────────────────────────────────────────

  function handleAddFormChange(field: keyof AddForm, value: string) {
    setAddForm(prev => {
      const next = { ...prev, [field]: value };
      // slugはnameが変わったとき、slug欄が空なら自動生成のプレビューをしない（保存時に生成）
      return next;
    });
    setAddError(null);
  }

  async function handleAdd() {
    const name = addForm.name.trim();
    if (!name) { setAddError("タグ名を入力してください"); return; }

    const slug = addForm.slug.trim() || generateSlug(name);
    const sort_order = parseInt(addForm.sort_order, 10) || 0;

    setAdding(true);
    const { error } = await supabase.from("tags").insert({
      name,
      slug,
      category: addForm.category,
      sort_order,
    });

    if (error) {
      setAddError("追加に失敗しました：" + error.message);
      setAdding(false);
      return;
    }

    setAddForm(ADD_FORM_DEFAULT);
    setShowAddForm(false);
    setAdding(false);
    setToast("タグを追加しました");
    await loadTags();
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditForm({ name: tag.name, slug: tag.slug, sort_order: String(tag.sort_order), description: tag.description ?? "" });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleSave(id: string) {
    const name = editForm.name.trim();
    if (!name) { setEditError("タグ名を入力してください"); return; }
    const slug = editForm.slug.trim() || generateSlug(name);
    const sort_order = parseInt(editForm.sort_order, 10) || 0;

    setSaving(true);
    const { error } = await supabase
      .from("tags")
      .update({ name, slug, sort_order, description: editForm.description.trim() || null })
      .eq("id", id);

    if (error) {
      setEditError("保存に失敗しました：" + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditingId(null);
    setToast("タグを更新しました");
    await loadTags();
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete(tag: Tag) {
    const usageMsg = tag.usageCount > 0
      ? `このタグは${tag.usageCount}件の施設で使用されています。削除すると施設からも解除されます。\n\n`
      : "";
    if (!window.confirm(`${usageMsg}このタグを削除しますか？関連する施設からも解除されます。`)) return;

    const { error } = await supabase.from("tags").delete().eq("id", tag.id);
    if (error) {
      setToast("削除に失敗しました");
      return;
    }
    setToast("タグを削除しました");
    await loadTags();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    items: tags.filter(t => t.category === cat.value),
  }));

  return (
    <div className="space-y-8 max-w-4xl">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">タグ管理</h1>
        <button
          type="button"
          onClick={() => { setShowAddForm(v => !v); setAddError(null); }}
          className="rounded-lg bg-[#1B4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2D6A4F] transition-colors"
        >
          {showAddForm ? "キャンセル" : "+ タグを追加"}
        </button>
      </div>

      {/* タグ追加フォーム */}
      {showAddForm && (
        <div className="rounded-xl border border-[#1B4332]/20 bg-[#D8F3DC]/20 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">新しいタグ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">タグ名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={addForm.name}
                onChange={e => handleAddFormChange("name", e.target.value)}
                placeholder="例：BBQスペース"
                className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">slug（空欄で自動生成）</label>
              <input
                type="text"
                value={addForm.slug}
                onChange={e => handleAddFormChange("slug", e.target.value)}
                placeholder="例：bbq-space"
                className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">カテゴリ</label>
              <select
                value={addForm.category}
                onChange={e => handleAddFormChange("category", e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">表示順</label>
              <input
                type="number"
                value={addForm.sort_order}
                onChange={e => handleAddFormChange("sort_order", e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
              />
            </div>
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="rounded-lg bg-[#1B4332] px-5 py-2 text-sm font-medium text-white hover:bg-[#2D6A4F] transition-colors disabled:opacity-50"
            >
              {adding ? "追加中..." : "追加"}
            </button>
          </div>
        </div>
      )}

      {/* ローディング */}
      {loading && (
        <div className="text-sm text-gray-400 py-8 text-center">読み込み中...</div>
      )}

      {/* カテゴリ別セクション */}
      {!loading && byCategory.map(cat => (
        <section key={cat.value}>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-700">{cat.label}</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 tabular-nums">
              {cat.items.length}
            </span>
          </div>

          {cat.items.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-400">タグがありません</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">タグ名</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">slug</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 hidden md:table-cell whitespace-nowrap">表示順</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">使用施設数</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cat.items.map(tag => {
                    const isEditing = editingId === tag.id;
                    return (
                      <Fragment key={tag.id}>
                        <tr className={`transition-colors ${isEditing ? "bg-amber-50" : "hover:bg-gray-50"}`}>
                          {isEditing ? (
                            <>
                              {/* 編集行 */}
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={editForm.name}
                                  onChange={e => { setEditForm(f => ({ ...f, name: e.target.value })); setEditError(null); }}
                                  className="w-full h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                                />
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <input
                                  type="text"
                                  value={editForm.slug}
                                  onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))}
                                  placeholder="空欄で自動生成"
                                  className="w-full h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                                />
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <input
                                  type="number"
                                  value={editForm.sort_order}
                                  onChange={e => setEditForm(f => ({ ...f, sort_order: e.target.value }))}
                                  className="w-20 h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                                />
                              </td>
                              <td className="px-4 py-3">
                                {editError && <p className="text-xs text-red-600 mb-1">{editError}</p>}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleSave(tag.id)}
                                    disabled={saving}
                                    className="rounded-md bg-[#1B4332] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2D6A4F] transition-colors disabled:opacity-50 whitespace-nowrap"
                                  >
                                    {saving ? "保存中" : "保存"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              {/* 通常行 */}
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{tag.name}</p>
                                {tag.description && (
                                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{tag.description}</p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden sm:table-cell">{tag.slug}</td>
                              <td className="px-4 py-3 text-gray-500 tabular-nums hidden md:table-cell">{tag.sort_order}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-medium tabular-nums ${tag.usageCount > 0 ? "text-gray-700" : "text-gray-400"}`}>
                                  {tag.usageCount} 件
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(tag)}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                  >
                                    編集
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(tag)}
                                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    削除
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                        {/* 説明文展開行（編集時のみ） */}
                        {isEditing && (
                          <tr className="bg-amber-50">
                            <td colSpan={5} className="px-4 pb-4">
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                  説明文（テーマページのSEO用テキスト）
                                </label>
                                <textarea
                                  value={editForm.description}
                                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                  rows={3}
                                  placeholder="テーマの特徴や魅力を記載してください（150〜300文字程度）"
                                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 resize-none focus:border-[#1B4332] focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                                />
                                <p className="text-xs text-gray-400 text-right">
                                  {editForm.description.length} 文字
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
