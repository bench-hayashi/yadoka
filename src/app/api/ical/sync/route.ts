import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type * as nodeIcal from "node-ical";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SourceResult = {
  name: string;
  url: string;
  status: "ok" | "error";
  count: number;
  error?: string;
};

function authedClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

// Extracts YYYY-MM-DD strings for each night covered by the event.
// All-day VEVENTs have an exclusive DTEND, timed events use date portion.
function extractNights(event: nodeIcal.VEvent): string[] {
  if (!event.start) return [];

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const startNorm = new Date(event.start);
  const endNorm = event.end ? new Date(event.end) : new Date(startNorm);

  // For all-day events end is exclusive; for timed events treat end date as inclusive.
  const endExclusive =
    event.datetype === "date"
      ? endNorm
      : (() => {
          const d = new Date(endNorm);
          d.setDate(d.getDate() + 1);
          return d;
        })();

  const nights: string[] = [];
  const cur = new Date(
    Date.UTC(
      startNorm.getFullYear(),
      startNorm.getMonth(),
      startNorm.getDate(),
    ),
  );
  const stop = new Date(
    Date.UTC(
      endExclusive.getFullYear(),
      endExclusive.getMonth(),
      endExclusive.getDate(),
    ),
  );

  while (cur < stop) {
    nights.push(toDateStr(new Date(cur)));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return nights;
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const db = authedClient(token);

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  let body: { facilityId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 },
    );
  }

  const facilityId = Number(body.facilityId);
  if (!Number.isInteger(facilityId) || facilityId <= 0) {
    return NextResponse.json(
      { error: "facilityId は正の整数で指定してください" },
      { status: 400 },
    );
  }

  // オーナー確認
  const { data: facility, error: facilityError } = await db
    .from("facilities")
    .select("id, owner_id")
    .eq("id", facilityId)
    .single();

  if (facilityError || !facility) {
    return NextResponse.json({ error: "施設が見つかりません" }, { status: 404 });
  }

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (facility.owner_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  // インポートソース一覧を取得
  const { data: sources, error: sourcesError } = await db
    .from("ical_import_sources")
    .select("id, name, url")
    .eq("facility_id", facilityId);

  if (sourcesError) {
    return NextResponse.json(
      { error: "ソース取得に失敗しました" },
      { status: 500 },
    );
  }

  if (!sources || sources.length === 0) {
    return NextResponse.json({ syncedDates: 0, sources: [] });
  }

  // source='ical' の既存レコードを全削除（全URL分をまとめて洗い替え）
  await db
    .from("availability")
    .delete()
    .eq("facility_id", facilityId)
    .eq("source", "ical");

  // 各URLをパース（ビルド時評価を避けるため動的import）
  const ical = await import("node-ical");
  const allDates = new Set<string>();
  const sourceResults: SourceResult[] = [];

  for (const src of sources) {
    try {
      const cal = await ical.async.fromURL(src.url);
      const nights: string[] = [];

      for (const component of Object.values(cal)) {
        if (!component || component.type !== "VEVENT") continue;
        nights.push(...extractNights(component as nodeIcal.VEvent));
      }

      const unique = [...new Set(nights)];
      unique.forEach((d) => allDates.add(d));

      await db
        .from("ical_import_sources")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", src.id);

      sourceResults.push({
        name: src.name,
        url: src.url,
        status: "ok",
        count: unique.length,
      });
    } catch (err) {
      sourceResults.push({
        name: src.name,
        url: src.url,
        status: "error",
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // manual/reservation の保護対象日を除外
  const { data: protectedRows } = await db
    .from("availability")
    .select("target_date")
    .eq("facility_id", facilityId)
    .in("source", ["manual", "reservation"]);

  const protectedDates = new Set(
    (protectedRows ?? []).map((r: { target_date: string }) => r.target_date),
  );

  const toInsert = [...allDates]
    .filter((d) => !protectedDates.has(d))
    .map((d) => ({
      facility_id: facilityId,
      target_date: d,
      is_available: false,
      source: "ical",
    }));

  if (toInsert.length > 0) {
    await db.from("availability").insert(toInsert);
  }

  return NextResponse.json({
    syncedDates: toInsert.length,
    sources: sourceResults,
  });
}
