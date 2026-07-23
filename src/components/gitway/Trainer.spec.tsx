// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { beforeEach } from "vitest";
import GitWayApp from "./GitWayApp";
import { mockApi, login } from "./test-helpers";

afterEach(cleanup);
beforeEach(() => mockApi());

function loginAndOpenTrainer() {
  render(<GitWayApp />);
  login(); // двокроковий вхід: відділ → ПІБ
  fireEvent.click(screen.getByText("Тренажер")); // перехід у Тренажер
}

describe("Тренажер — уніфікована бібліотека з пошуком", () => {
  it("пошук + Довідник фільтрує команди за ключовим словом", () => {
    loginAndOpenTrainer();
    fireEvent.click(screen.getByText("Довідник"));
    const search = screen.getByLabelText("Пошук команди");
    fireEvent.change(search, { target: { value: "commit" } });
    // у git-категорії має лишитись git commit
    expect(screen.getByText(/git commit/)).toBeTruthy();
    // а pull — ні (не містить "commit")
    expect(screen.queryByText("$ git pull")).toBeNull();
  });

  it("«Усі джерела» показує команди Claude/Codex поряд із Git", () => {
    loginAndOpenTrainer();
    fireEvent.click(screen.getByText("Довідник"));
    fireEvent.click(screen.getByText("Усі джерела"));
    const search = screen.getByLabelText("Пошук команди");
    fireEvent.change(search, { target: { value: "модель" } }); // desc для /model
    // мають зʼявитися картки з бейджами Claude Code та Codex
    expect(screen.getAllByText(/Claude Code|Codex/).length).toBeGreaterThan(0);
  });

  it("порожній результат показує підказку", () => {
    loginAndOpenTrainer();
    const search = screen.getByLabelText("Пошук команди");
    fireEvent.change(search, { target: { value: "zzzнемаєтакого" } });
    expect(screen.getByText(/Нічого не знайдено/)).toBeTruthy();
    void within;
  });
});
