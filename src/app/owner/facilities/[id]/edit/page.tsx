"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import FacilityForm, { type FormData } from "@/components/owner/FacilityForm";

type FacilityRow = {
  id: string;
  owner_id: string;
  name: string;
  area_id: string | null;
  address: string | null;
  description: string | null;
  max_guests: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  checkin_time: string | null;
  checkout_time: string | null;
  min_nights: number | null;
  status: string;
};

export default function EditFacilityPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [initialForm, setInitialForm] = useState<Partial<FormData> | null>(null);
  const [initialTagIds, setInitialTagIds] = useState<string[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("draft");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    async function load() {
      const { data, error } = await supabase
        .from("facilities")
        .select(
          "id, owner_id, name, area_id, address, description, max_guests, bedrooms, bathrooms, parking_spaces, checkin_time, checkout_time, min_nights, status"
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        setFetchError("施設が見つかりませんでした。");
        setLoading(false);
        return;
      }

      const facility = data as FacilityRow;

      if (facility.owner_id !== user!.id) {
        router.replace("/unauthorized");
        return;
      }

      const { data: tagRows } = await supabase
        .from("facility_tags")
        .select("tag_id")
        .eq("facility_id", id);

      setInitialForm({
        name:          facility.name ?? "",
        areaId:        facility.area_id ?? "",
        address:       facility.address ?? "",
        description:   facility.description ?? "",
        maxGuests:     facility.max_guests != null ? String(facility.max_guests) : "",
        bedrooms:      facility.bedrooms != null ? String(facility.bedrooms) : "",
        bathrooms:     facility.bathrooms != null ? String(facility.bathrooms) : "",
        parkingSpaces: facility.parking_spaces != null ? String(facility.parking_spaces) : "",
        checkinTime:   facility.checkin_time ?? "15:00",
        checkoutTime:  facility.checkout_time ?? "10:00",
        minNights:     facility.min_nights != null ? String(facility.min_nights) : "1",
      });
      setInitialTagIds(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tagRows ?? []).map((r: any) => r.tag_id as string)
      );
      setCurrentStatus(facility.status ?? "draft");
      setLoading(false);
    }

    load();
  }, [user, authLoading, id, router]);

  if (authLoading || loading) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">読み込み中...</div>
    );
  }

  if (fetchError) {
    return (
      <div className="text-sm text-red-500 py-8 text-center">{fetchError}</div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">施設情報を編集する</h1>

      {currentStatus === "rejected" && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          この施設は審査で差し戻されました。内容を修正して再申請できます。
        </div>
      )}

      <FacilityForm
        mode="edit"
        initialFacilityId={id}
        initialForm={initialForm!}
        initialTagIds={initialTagIds}
        currentStatus={currentStatus}
      />
    </div>
  );
}
