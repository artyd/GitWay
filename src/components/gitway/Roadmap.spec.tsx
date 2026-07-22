// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import GitWayApp from "./GitWayApp";

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

function seed(completed: number[], current: number) {
  window.localStorage.setItem(
    "gitway:progress:v1:director",
    JSON.stringify({ completed, current, xp: current * 60, streak: 0, trKnown: [] }),
  );
}

describe("Роадмап — нові CLI-курси й розблокування", () => {
  it("показує 5 курсів, зокрема два нові CLI-курси", () => {
    render(<GitWayApp />);
    fireEvent.click(screen.getByText("Директор"));
    expect(screen.getByText("Основи Git")).toBeTruthy();
    expect(screen.getByText("Claude Code CLI")).toBeTruthy();
    expect(screen.getByText("OpenAI Codex CLI")).toBeTruthy();
  });

  it("нові курси заблоковані, поки не пройдено всі 11 базових уроків", () => {
    seed([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 11); // 10 з 11 — фаза 3 незавершена
    render(<GitWayApp />);
    fireEvent.click(screen.getByText("Директор"));
    // Claude Code CLI (фаза 4) заблоковано → є повідомлення «Завершіть Рівень 3»
    expect(screen.getByText(/Завершіть Рівень 3/)).toBeTruthy();
  });

  it("Claude Code відкривається після 11 уроків; Codex лишається закритим до завершення Claude", () => {
    seed([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 12); // усі 11 базових пройдено
    render(<GitWayApp />);
    fireEvent.click(screen.getByText("Директор"));
    // Codex (фаза 5) все ще закритий доти, доки не завершено фазу 4
    expect(screen.getByText(/Завершіть Рівень 4/)).toBeTruthy();
    // А фаза 4 (Claude) вже відкрита — зʼявляється поточний урок «Почати»
    expect(screen.getAllByText(/Почати/).length).toBeGreaterThan(0);
    // І немає повідомлення про блокування фази 4
    expect(screen.queryByText(/Завершіть Рівень 3/)).toBeNull();
  });
});
