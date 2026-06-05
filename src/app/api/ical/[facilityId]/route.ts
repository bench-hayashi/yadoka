import type { NextRequest } from "next/server";
import ical from "ical-generator";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ facilityId: string }> },
) {
  const { facilityId } = await params;

  const facilityIdNum = Number(facilityId);
  if (!Number.isInteger(facilityIdNum) || facilityIdNum <= 0) {
    return new Response("Invalid facilityId", { status: 400 });
  }

  const { data: facility, error: facilityError } = await supabase
    .from("facilities")
    .select("name")
    .eq("id", facilityIdNum)
    .single();

  if (facilityError || !facility) {
    return new Response("Facility not found", { status: 404 });
  }

  const [{ data: unavailableDates }, { data: approvedReservations }] =
    await Promise.all([
      supabase
        .from("availability")
        .select("target_date")
        .eq("facility_id", facilityIdNum)
        .eq("is_available", false),
      supabase
        .from("reservation_requests")
        .select("checkin_date, checkout_date")
        .eq("facility_id", facilityIdNum)
        .eq("status", "approved"),
    ]);

  const calendar = ical({ name: `YADOKA - ${facility.name}` });

  for (const row of unavailableDates ?? []) {
    const date = new Date(row.target_date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    calendar.createEvent({
      start: date,
      end: nextDay,
      summary: "予約済み（YADOKA）",
      allDay: true,
    });
  }

  for (const row of approvedReservations ?? []) {
    calendar.createEvent({
      start: new Date(row.checkin_date),
      end: new Date(row.checkout_date),
      summary: "予約済み（YADOKA）",
      allDay: true,
    });
  }

  return new Response(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="yadoka-facility-${facilityId}.ics"`,
    },
  });
}
