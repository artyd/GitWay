// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import GitWayApp from "./GitWayApp";
import { mockApi, login, type Seed } from "./test-helpers";

let seeded: Seed = null;
afterEach(cleanup);
beforeEach(() => { seeded = null; mockApi(() => seeded); });

describe("Роадмап — нові CLI-курси й розблокування", () => {
  it("показує 5 курсів, зокрема два нові CLI-курси", async () => {
    render(<GitWayApp />);
    login();
    expect(await screen.findByText("Основи Git")).toBeTruthy();
    expect(screen.getByText("Claude Code CLI")).toBeTruthy();
    expect(screen.getByText("OpenAI Codex CLI")).toBeTruthy();
  });

  it("нові курси заблоковані, поки не пройдено всі 11 базових уроків", async () => {
    seeded = { completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], current: 11 }; // 10 з 11 — фаза 3 незавершена
    render(<GitWayApp />);
    login();
    // Claude Code CLI (фаза 4) заблоковано → є повідомлення «Завершіть Рівень 3»
    expect(await screen.findByText(/Завершіть Рівень 3/)).toBeTruthy();
  });

  it("Claude Code відкривається після 11 уроків; Codex лишається закритим до завершення Claude", async () => {
    seeded = { completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], current: 12 }; // усі 11 базових пройдено
    render(<GitWayApp />);
    login();
    // Після підтягування прогресу фаза 4 відкривається (немає блокування Рівня 3)
    await waitFor(() => expect(screen.queryByText(/Завершіть Рівень 3/)).toBeNull());
    // Codex (фаза 5) все ще закритий доти, доки не завершено фазу 4
    expect(screen.getByText(/Завершіть Рівень 4/)).toBeTruthy();
    // А фаза 4 (Claude) вже відкрита — зʼявляється поточний урок «Почати»
    expect(screen.getAllByText(/Почати/).length).toBeGreaterThan(0);
  });
});
