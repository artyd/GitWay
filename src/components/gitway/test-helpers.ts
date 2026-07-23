// Спільні утиліти для тестів GitWayApp: двокроковий вхід (відділ → ПІБ)
// та мок серверного API прогресу/рейтингу (замість localStorage).
import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";

export type Seed = { completed: number[]; current: number; xp?: number; streak?: number; trKnown?: string[] } | null;

function jsonRes(data: unknown) {
  return { ok: true, json: async () => data } as Response;
}

// Мокає /api/progress (GET/POST) і /api/leaderboard. seed() повертає збережений прогрес.
export function mockApi(seed: () => Seed = () => null) {
  const fn = vi.fn(async (url: RequestInfo | URL, opts?: RequestInit) => {
    const u = String(url);
    if (u.includes("/api/progress")) {
      if (opts?.method === "POST") return jsonRes({ ok: true });
      const p = seed();
      return jsonRes({ progress: p ? { completed: p.completed, current: p.current, xp: p.xp ?? 0, streak: p.streak ?? 0, trKnown: p.trKnown ?? [] } : null });
    }
    if (u.includes("/api/leaderboard")) return jsonRes({ rows: [], myRank: null });
    return jsonRes({});
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

// Двокроковий вхід: клік по відділу, потім по ПІБ.
export function login(dept = "ІТ", name = "Зубар Руслан") {
  fireEvent.click(screen.getByText(dept));
  fireEvent.click(screen.getByText(name));
}
