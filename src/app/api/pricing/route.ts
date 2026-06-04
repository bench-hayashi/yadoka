import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { calculateTotalPrice, checkAvailability } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const facilityIdStr = searchParams.get("facilityId");
  const checkin       = searchParams.get("checkin");
  const checkout      = searchParams.get("checkout");

  if (!facilityIdStr || !checkin || !checkout) {
    return NextResponse.json(
      { error: "facilityId, checkin, checkout は必須パラメータです。" },
      { status: 400 },
    );
  }

  const facilityId = Number(facilityIdStr);
  if (!Number.isInteger(facilityId) || facilityId <= 0) {
    return NextResponse.json(
      { error: "facilityId は正の整数で指定してください。" },
      { status: 400 },
    );
  }

  if (checkin >= checkout) {
    return NextResponse.json(
      { error: "checkout は checkin より後の日付を指定してください。" },
      { status: 400 },
    );
  }

  const adults   = Math.max(0, Number(searchParams.get("adults")   ?? "2"));
  const children = Math.max(0, Number(searchParams.get("children") ?? "0"));
  const infants  = Math.max(0, Number(searchParams.get("infants")  ?? "0"));
  const pets     = Math.max(0, Number(searchParams.get("pets")     ?? "0"));

  const [pricing, availability] = await Promise.all([
    calculateTotalPrice({ facilityId, checkinDate: checkin, checkoutDate: checkout, adults, children, infants, pets }),
    checkAvailability(facilityId, checkin, checkout),
  ]);

  return NextResponse.json({ pricing, availability });
}
