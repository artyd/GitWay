// Прогрес одного учасника: GET ?user=<id> — завантажити; POST — зберегти (upsert).
import { NextResponse } from "next/server";
import { getProgress, upsertProgress, type ProgressRow } from "@/lib/db";

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("user");
  if (!userId) return NextResponse.json({ error: "user обовʼязковий" }, { status: 400 });
  try {
    const row = await getProgress(userId);
    return NextResponse.json({ progress: row });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: Partial<ProgressRow>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "некоректний JSON" }, { status: 400 });
  }
  if (!body.userId || !body.name || !body.deptKey) {
    return NextResponse.json({ error: "userId, name, deptKey обовʼязкові" }, { status: 400 });
  }
  try {
    await upsertProgress({
      userId: body.userId,
      name: body.name,
      department: body.department ?? "",
      deptKey: body.deptKey,
      completed: body.completed ?? [],
      current: body.current ?? 1,
      xp: body.xp ?? 0,
      streak: body.streak ?? 0,
      trKnown: body.trKnown ?? [],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
