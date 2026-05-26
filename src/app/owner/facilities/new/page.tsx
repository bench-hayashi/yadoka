"use client";

import FacilityForm from "@/components/owner/FacilityForm";

export default function NewFacilityPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">施設を登録する</h1>
      <FacilityForm mode="new" />
    </div>
  );
}
