// Рейтинг. Без фільтрів — топ-10 за XP. З параметром department — усі учасники
// відділу (роестр), навіть з 0 XP. sort=xp|name, dir=desc|asc. me=<id> додає ранг.
import { NextResponse } from "next/server";
import { topProgress, progressByDept, xpTotalsByDept, rankOf, type LbRow } from "@/lib/db";
import { DEPARTMENTS, deptByKey, peopleByDept, personId, initialsOf } from "@/lib/roster";

type OutRow = {
  id: string; name: string; department: string; deptKey: string;
  xp: number; initials: string; color: string; icon: string; rank: number;
  count?: number; totalXp?: number;
};

function decorate(r: LbRow): Omit<OutRow, "rank"> {
  const d = deptByKey(r.deptKey);
  return {
    id: r.userId, name: r.name, department: r.department, deptKey: r.deptKey,
    xp: r.xp, initials: initialsOf(r.name),
    color: d?.color ?? "#14b8a6", icon: d?.icon ?? "fa-solid fa-user",
  };
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const mode = q.get("mode") === "dept" ? "dept" : "people";
  const department = q.get("department") || "";
  const sort = q.get("sort") === "name" ? "name" : "xp";
  const dir = q.get("dir") === "asc" ? "asc" : "desc";
  const me = q.get("me") || "";
  const limitRaw = parseInt(q.get("limit") || "10", 10);
  const limit = Math.min(100, Math.max(1, isNaN(limitRaw) ? 10 : limitRaw));

  try {
    // Рейтинг відділів: середній XP на учасника (сума XP відділу / кількість у роестрі).
    // Знаменник — усі люди відділу з роестру (навіть з 0 XP), щоб великий відділ не вигравав лише розміром.
    if (mode === "dept") {
      const totals = new Map((await xpTotalsByDept()).map((t) => [t.deptKey, t.totalXp]));
      const deptRows = DEPARTMENTS
        .map((d) => {
          const count = peopleByDept(d.key).length;
          const totalXp = totals.get(d.key) ?? 0;
          const avg = count ? Math.round(totalXp / count) : 0;
          return {
            id: d.key, name: d.name, department: `${count} учасників · сума ${totalXp} XP`,
            deptKey: d.key, xp: avg, initials: initialsOf(d.name), color: d.color, icon: d.icon,
            count, totalXp,
          } satisfies Omit<OutRow, "rank">;
        })
        .filter((r) => (r.count ?? 0) > 0);
      deptRows.sort((a, b) => b.xp - a.xp);
      const out: OutRow[] = deptRows.map((r, i) => ({ ...r, rank: i + 1 }));
      return NextResponse.json({ rows: out, filtered: false, mode, sort: "xp", dir: "desc", department: "", myRank: null });
    }

    let rows: Omit<OutRow, "rank">[];
    let filtered = false;

    if (department) {
      filtered = true;
      const dept = deptByKey(department);
      const xpByPerson = new Map((await progressByDept(department)).map((r) => [r.userId, r.xp]));
      // Усі люди відділу з роестру — навіть без прогресу (0 XP).
      rows = peopleByDept(department).map((p) => {
        const id = personId(p);
        return {
          id, name: p.name, department: dept?.name ?? department, deptKey: department,
          xp: xpByPerson.get(id) ?? 0, initials: initialsOf(p.name),
          color: dept?.color ?? "#14b8a6", icon: dept?.icon ?? "fa-solid fa-user",
        };
      });
    } else {
      // Дефолт: лише топ-N за XP серед тих, хто почав.
      rows = (await topProgress(limit)).map(decorate);
    }

    // Сортування
    rows.sort((a, b) => {
      const cmp = sort === "name" ? a.name.localeCompare(b.name, "uk") : a.xp - b.xp;
      return dir === "asc" ? cmp : -cmp;
    });

    const out: OutRow[] = rows.map((r, i) => ({ ...r, rank: i + 1 }));
    const myRank = me ? await rankOf(me) : null;

    return NextResponse.json({ rows: out, filtered, mode, sort, dir, department, myRank });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
