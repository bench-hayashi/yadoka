"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type Area = { id: string; name: string };
type Tag  = { id: string; name: string; category: string };

export type FormData = {
  name: string;
  areaId: string;
  address: string;
  description: string;
  maxGuests: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpaces: string;
  checkinTime: string;
  checkoutTime: string;
  minNights: string;
  licenseType: string;
  licenseNumber: string;
};

const DEFAULT_FORM: FormData = {
  name: "",
  areaId: "",
  address: "",
  description: "",
  maxGuests: "",
  bedrooms: "",
  bathrooms: "",
  parkingSpaces: "",
  checkinTime: "15:00",
  checkoutTime: "10:00",
  minNights: "1",
  licenseType: "",
  licenseNumber: "",
};

const LICENSE_TYPE_OPTIONS = [
  { value: "", label: "選択してください" },
  { value: "住宅宿泊事業（民泊）", label: "住宅宿泊事業（民泊）" },
  { value: "簡易宿所営業（旅館業法）", label: "簡易宿所営業（旅館業法）" },
  { value: "旅館・ホテル営業（旅館業法）", label: "旅館・ホテル営業（旅館業法）" },
  { value: "国家戦略特区民泊", label: "国家戦略特区民泊" },
];

const CATEGORY_LABEL: Record<string, string> = {
  facility: "設備",
  theme:    "テーマ",
  amenity:  "アメニティ",
};
const CATEGORY_ORDER = ["facility", "amenity", "theme"];
const STEPS = ["基本情報", "宿泊条件", "タグ選択"] as const;

function generateSlug(): string {
  return `facility-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((label, i) => (
        <Fragment key={label}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < current
                  ? "bg-[#1B4332] text-white"
                  : i === current
                  ? "bg-[#1B4332] text-white ring-4 ring-[#D8F3DC]"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs font-medium ${
                i === current ? "text-[#1B4332]" : i < current ? "text-[#2D6A4F]" : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-0.5 w-14 mx-2 mb-5 transition-colors ${
                i < current ? "bg-[#1B4332]" : "bg-gray-200"
              }`}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

type Props = {
  mode: "new" | "edit";
  initialFacilityId?: string;
  initialForm?: Partial<FormData>;
  initialTagIds?: string[];
  currentStatus?: string;
};

export default function FacilityForm({
  mode,
  initialFacilityId,
  initialForm,
  initialTagIds = [],
  currentStatus = "draft",
}: Props) {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [areas, setAreas] = useState<Area[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(initialTagIds)
  );
  const [facilityId, setFacilityId] = useState<string | null>(
    initialFacilityId ?? null
  );
  const [form, setForm] = useState<FormData>({ ...DEFAULT_FORM, ...initialForm });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("areas").select("id, name").order("sort_order"),
      supabase.from("tags").select("id, name, category").order("sort_order"),
    ]).then(([areasRes, tagsRes]) => {
      setAreas((areasRes.data ?? []) as Area[]);
      setTags((tagsRes.data ?? []) as Tag[]);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function setField<K extends keyof FormData>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function validateStep(s: number): Record<string, string> {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!form.name.trim()) errs.name = "施設名を入力してください";
      if (!form.address.trim()) errs.address = "住所を入力してください";
      if (!form.description.trim()) errs.description = "説明文を入力してください";
      if (!form.licenseType) errs.licenseType = "許可種別を選択してください";
      if (!form.licenseNumber.trim()) errs.licenseNumber = "許可番号・届出番号を入力してください";
    }
    if (s === 1) {
      const n = Number(form.maxGuests);
      if (!form.maxGuests || isNaN(n) || n < 1)
        errs.maxGuests = "最大定員は1名以上で入力してください";
    }
    return errs;
  }

  async function saveFacility(status: string): Promise<string> {
    if (!user) throw new Error("未ログイン");

    const basePayload = {
      owner_id:       user.id,
      name:           form.name.trim() || "無題",
      area_id:        form.areaId || null,
      address:        form.address.trim() || null,
      description:    form.description.trim() || null,
      max_guests:     form.maxGuests     ? Number(form.maxGuests)     : null,
      bedrooms:       form.bedrooms      ? Number(form.bedrooms)      : null,
      bathrooms:      form.bathrooms     ? Number(form.bathrooms)     : null,
      parking_spaces: form.parkingSpaces ? Number(form.parkingSpaces) : null,
      checkin_time:   form.checkinTime  || null,
      checkout_time:  form.checkoutTime || null,
      min_nights:     form.minNights     ? Number(form.minNights)     : 1,
      license_type:   form.licenseType.trim()  || null,
      license_number: form.licenseNumber.trim() || null,
      status,
    };

    let id = facilityId;

    if (!id) {
      const { data, error } = await supabase
        .from("facilities")
        .insert({ ...basePayload, slug: generateSlug(), is_published: false })
        .select("id")
        .single();
      if (error) throw error;
      id = (data as { id: string }).id;
      setFacilityId(id);
    } else {
      const { error } = await supabase
        .from("facilities")
        .update(basePayload)
        .eq("id", id);
      if (error) throw error;
    }

    await supabase.from("facility_tags").delete().eq("facility_id", id);
    if (selectedTagIds.size > 0) {
      const { error } = await supabase.from("facility_tags").insert(
        [...selectedTagIds].map((tagId) => ({ facility_id: id, tag_id: tagId }))
      );
      if (error) throw error;
    }

    return id;
  }

  async function handleDraftSave() {
    if (!form.name.trim()) {
      setErrors({ name: "下書き保存には施設名が必要です" });
      if (step !== 0) setStep(0);
      return;
    }
    setSaving(true);
    try {
      await saveFacility("draft");
      setToast("下書きを保存しました");
    } catch {
      setToast("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    const errs = { ...validateStep(0), ...validateStep(1) };
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      const submitStatus =
        mode === "new" || currentStatus === "rejected" ? "pending" : currentStatus;
      await saveFacility(submitStatus);
      setSubmitted(true);
      setTimeout(() => router.push("/owner/facilities"), 2500);
    } catch {
      setToast("送信に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  const tagsByCategory = CATEGORY_ORDER.reduce<Record<string, Tag[]>>((acc, cat) => {
    const items = tags.filter((t) => t.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  if (submitted) {
    const isReapply = mode === "edit" && currentStatus === "rejected";
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-green-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-900">
          {mode === "new"
            ? "施設を登録申請しました。"
            : isReapply
            ? "再申請しました。"
            : "施設情報を更新しました。"}
        </p>
        {(mode === "new" || isReapply) && (
          <p className="text-sm text-gray-500">管理者の審査をお待ちください。</p>
        )}
        <p className="text-xs text-gray-400">施設管理ページに移動しています…</p>
      </div>
    );
  }

  const inputCls = (field: string) =>
    `w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent ${
      errors[field] ? "border-red-400" : "border-gray-300"
    }`;

  const isRejected = mode === "edit" && currentStatus === "rejected";
  const submitLabel =
    mode === "new" ? "登録申請" : isRejected ? "再申請" : "更新";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <StepIndicator current={step} />

      <div className="rounded-xl bg-white border border-gray-200 p-6 space-y-6">
        {/* Step 1: 基本情報 */}
        {step === 0 && (
          <>
            <h2 className="text-base font-semibold text-gray-900">基本情報</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  施設名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="例：富士山ビューヴィラ"
                  className={inputCls("name")}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="areaId" className="block text-sm font-medium text-gray-700 mb-1">
                  エリア
                </label>
                <select
                  id="areaId"
                  value={form.areaId}
                  onChange={(e) => setField("areaId", e.target.value)}
                  className={inputCls("areaId")}
                >
                  <option value="">エリアを選択</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  住所 <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  type="text"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="例：山梨県南都留郡山中湖村山中1234-5"
                  className={inputCls("address")}
                />
                {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  説明文 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  rows={6}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="施設の魅力や特徴をご記入ください"
                  className={`${inputCls("description")} resize-none`}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600">{errors.description}</p>
                )}
              </div>

              {/* 許可・届出情報 */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-600">許可・届出情報</p>
                <div>
                  <label htmlFor="licenseType" className="block text-sm font-medium text-gray-700 mb-1">
                    許可種別 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="licenseType"
                    value={form.licenseType}
                    onChange={(e) => setField("licenseType", e.target.value)}
                    className={inputCls("licenseType")}
                  >
                    {LICENSE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.licenseType && <p className="mt-1 text-xs text-red-600">{errors.licenseType}</p>}
                </div>
                <div>
                  <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    許可番号・届出番号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="licenseNumber"
                    type="text"
                    value={form.licenseNumber}
                    onChange={(e) => setField("licenseNumber", e.target.value)}
                    placeholder="例：〇〇県△△第1234号"
                    className={inputCls("licenseNumber")}
                  />
                  {errors.licenseNumber && <p className="mt-1 text-xs text-red-600">{errors.licenseNumber}</p>}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 2: 宿泊条件 */}
        {step === 1 && (
          <>
            <h2 className="text-base font-semibold text-gray-900">宿泊条件</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="maxGuests" className="block text-sm font-medium text-gray-700 mb-1">
                    最大定員 <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="maxGuests"
                    type="number"
                    min={1}
                    value={form.maxGuests}
                    onChange={(e) => setField("maxGuests", e.target.value)}
                    placeholder="10"
                    className={inputCls("maxGuests")}
                  />
                  {errors.maxGuests && (
                    <p className="mt-1 text-xs text-red-600">{errors.maxGuests}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="minNights" className="block text-sm font-medium text-gray-700 mb-1">
                    最低泊数
                  </label>
                  <input
                    id="minNights"
                    type="number"
                    min={1}
                    value={form.minNights}
                    onChange={(e) => setField("minNights", e.target.value)}
                    className={inputCls("minNights")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
                    寝室数
                  </label>
                  <input
                    id="bedrooms"
                    type="number"
                    min={0}
                    value={form.bedrooms}
                    onChange={(e) => setField("bedrooms", e.target.value)}
                    placeholder="3"
                    className={inputCls("bedrooms")}
                  />
                </div>
                <div>
                  <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">
                    バスルーム数
                  </label>
                  <input
                    id="bathrooms"
                    type="number"
                    min={0}
                    value={form.bathrooms}
                    onChange={(e) => setField("bathrooms", e.target.value)}
                    placeholder="2"
                    className={inputCls("bathrooms")}
                  />
                </div>
                <div>
                  <label htmlFor="parkingSpaces" className="block text-sm font-medium text-gray-700 mb-1">
                    駐車場台数
                  </label>
                  <input
                    id="parkingSpaces"
                    type="number"
                    min={0}
                    value={form.parkingSpaces}
                    onChange={(e) => setField("parkingSpaces", e.target.value)}
                    placeholder="3"
                    className={inputCls("parkingSpaces")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="checkinTime" className="block text-sm font-medium text-gray-700 mb-1">
                    チェックイン時間
                  </label>
                  <input
                    id="checkinTime"
                    type="time"
                    value={form.checkinTime}
                    onChange={(e) => setField("checkinTime", e.target.value)}
                    className={inputCls("checkinTime")}
                  />
                </div>
                <div>
                  <label htmlFor="checkoutTime" className="block text-sm font-medium text-gray-700 mb-1">
                    チェックアウト時間
                  </label>
                  <input
                    id="checkoutTime"
                    type="time"
                    value={form.checkoutTime}
                    onChange={(e) => setField("checkoutTime", e.target.value)}
                    className={inputCls("checkoutTime")}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 3: タグ選択 */}
        {step === 2 && (
          <>
            <h2 className="text-base font-semibold text-gray-900">タグ選択</h2>
            <p className="text-sm text-gray-500">
              施設に当てはまるタグを選択してください（複数可）。
            </p>
            {Object.keys(tagsByCategory).length === 0 ? (
              <p className="text-sm text-gray-400">利用可能なタグがありません。</p>
            ) : (
              <div className="space-y-6">
                {CATEGORY_ORDER.filter((cat) => tagsByCategory[cat]).map((cat) => (
                  <div key={cat}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                      {CATEGORY_LABEL[cat] ?? cat}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tagsByCategory[cat].map((tag) => (
                        <label
                          key={tag.id}
                          className={`flex items-center gap-1.5 cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors select-none ${
                            selectedTagIds.has(tag.id)
                              ? "border-[#1B4332] bg-[#D8F3DC] text-[#1B4332]"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={selectedTagIds.has(tag.id)}
                            onChange={() => toggleTag(tag.id)}
                          />
                          {tag.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ボタンエリア */}
      <div className="flex items-center justify-between gap-3">
        <div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                setErrors({});
                setStep((s) => s - 1);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              戻る
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDraftSave}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "保存中…" : "下書き保存"}
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-[#1B4332] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2D6A4F] transition-colors"
            >
              次へ
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "送信中…" : submitLabel}
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
