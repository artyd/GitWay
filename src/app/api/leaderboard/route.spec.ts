import { describe, it, expect, vi } from "vitest";

// Мок серверного модуля БД (щоб не піднімати Postgres і не тягнути "server-only").
// Роестр (@/lib/roster) використовуємо справжній — саме він дає знаменник (кількість у відділі).
const mocks = vi.hoisted(() => ({
  xpTotalsByDept: vi.fn(),
  topProgress: vi.fn(),
  progressByDept: vi.fn(),
  rankOf: vi.fn(),
}));

vi.mock("@/lib/db", () => mocks);

import { GET } from "./route";
import { peopleByDept } from "@/lib/roster";

function req(qs: string) {
  return new Request(`http://localhost/api/leaderboard${qs}`);
}

describe("GET /api/leaderboard?mode=dept — рейтинг відділів (середній XP на учасника)", () => {
  it("ділить суму XP відділу на кількість людей у роестрі та сортує за середнім", async () => {
    // prodazhi: 12 людей, сума 2400 → середній 200; it: 3 людини, сума 300 → середній 100.
    mocks.xpTotalsByDept.mockResolvedValue([
      { deptKey: "prodazhi", totalXp: 2400 },
      { deptKey: "it", totalXp: 300 },
    ]);

    const res = await GET(req("?mode=dept"));
    const body = await res.json();

    expect(body.mode).toBe("dept");
    expect(body.rows).toHaveLength(8); // усі відділи роестру

    // Верхній рядок — відділ із найбільшим середнім.
    const top = body.rows[0];
    expect(top.id).toBe("prodazhi");
    expect(top.rank).toBe(1);
    expect(top.count).toBe(peopleByDept("prodazhi").length); // 12
    expect(top.totalXp).toBe(2400);
    expect(top.xp).toBe(200); // 2400 / 12
    expect(top.department).toContain("12 учасників");

    const it = body.rows.find((r: { id: string }) => r.id === "it");
    expect(it.xp).toBe(100); // 300 / 3
    expect(it.rank).toBe(2);

    // Відділ без прогресу — середній 0, у кінці рейтингу.
    const hr = body.rows.find((r: { id: string }) => r.id === "hr");
    expect(hr.xp).toBe(0);
    expect(hr.totalXp).toBe(0);
    expect(body.rows[body.rows.length - 1].xp).toBe(0);
  });
});

describe("GET /api/leaderboard — режим учасників (без змін) не зламано", () => {
  it("повертає топ за XP із рангами", async () => {
    mocks.topProgress.mockResolvedValue([
      { userId: "prodazhi:A", name: "A", department: "Продажі", deptKey: "prodazhi", xp: 50 },
      { userId: "it:B", name: "B", department: "ІТ", deptKey: "it", xp: 80 },
    ]);

    const res = await GET(req(""));
    const body = await res.json();

    expect(body.mode).toBe("people");
    expect(body.rows[0].name).toBe("B"); // 80 XP — перший
    expect(body.rows[0].rank).toBe(1);
    expect(body.rows[1].name).toBe("A");
    expect(body.rows[0].initials).toBe("B"); // decorate() рахує ініціали
  });
});
