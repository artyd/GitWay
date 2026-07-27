// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import GitWayApp from "./GitWayApp";
import { login } from "./test-helpers";

// Рядки рейтингу відділів (топ-3), які повертає /api/leaderboard?mode=dept.
const DEPT_ROWS = [
  { id: "prodazhi", name: "Продажі", department: "11 учасників · сума 2200 XP", deptKey: "prodazhi", xp: 200, initials: "Пр", color: "#14b8a6", icon: "fa-solid fa-handshake", rank: 1, count: 11, totalXp: 2200 },
  { id: "it", name: "ІТ", department: "3 учасників · сума 300 XP", deptKey: "it", xp: 100, initials: "ІТ", color: "#7c6ee0", icon: "fa-solid fa-laptop-code", rank: 2, count: 3, totalXp: 300 },
  { id: "zakupivli", name: "Закупівлі", department: "8 учасників · сума 400 XP", deptKey: "zakupivli", xp: 50, initials: "За", color: "#e6a15a", icon: "fa-solid fa-cart-shopping", rank: 3, count: 8, totalXp: 400 },
];

function jsonRes(data: unknown) {
  return { ok: true, json: async () => data } as Response;
}

beforeEach(() => {
  global.fetch = vi.fn(async (url: RequestInfo | URL) => {
    const u = String(url);
    if (u.includes("/api/leaderboard") && u.includes("mode=dept")) return jsonRes({ rows: DEPT_ROWS, mode: "dept", myRank: null });
    if (u.includes("/api/leaderboard")) return jsonRes({ rows: [], myRank: null });
    if (u.includes("/api/progress")) return jsonRes({ progress: null });
    return jsonRes({});
  }) as unknown as typeof fetch;
});
afterEach(cleanup);

describe("Вітальний п'єдестал відділів при вході", () => {
  it("показує топ-3 відділи з кубком і медалями та підсвічує відділ користувача", async () => {
    const { container } = render(<GitWayApp />);
    login("ІТ", "Зубар Руслан"); // користувач із відділу «ІТ» — має бути 2 місце

    // З'явилося вітальне вікно.
    expect(await screen.findByText("Рейтинг відділів")).toBeTruthy();

    // Усі три відділи на подіумі. («ІТ» дублюється: ініціали + назва відділу.)
    expect(screen.getByText("Продажі")).toBeTruthy();
    expect(screen.getAllByText("ІТ").length).toBeGreaterThan(0);
    expect(screen.getByText("Закупівлі")).toBeTruthy();

    // Кубок на 1 місці + дві медалі на 2 і 3.
    expect(container.querySelector(".fa-trophy")).toBeTruthy();
    expect(container.querySelectorAll(".fa-medal").length).toBe(2);

    // Відділ користувача (ІТ) підсвічено бейджем.
    expect(screen.getByText("ваш відділ")).toBeTruthy();

    // Кнопка закриває вікно.
    fireEvent.click(screen.getByText("До навчання"));
    await waitFor(() => expect(screen.queryByText("Рейтинг відділів")).toBeNull());
  });
});
