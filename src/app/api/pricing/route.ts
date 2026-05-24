import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { calculateTotalPrice, checkAvailability } from "@/lib/pricing";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const facilityIdStr = searchParams.get("facilityId");
  const checkin = searchParams.get("checkin");
  const checkout = searchParams.get("checkout");

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

  const [pricing, availability] = await Promise.all([
    calculateTotalPrice(facilityId, checkin, checkout),
    checkAvailability(facilityId, checkin, checkout),
  ]);

  return NextResponse.json({ pricing, availability });
}
