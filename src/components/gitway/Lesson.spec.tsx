// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import GitWayApp from "./GitWayApp";

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

// Розблоковуємо фазу 4 (усі 11 базових уроків пройдено, поточний — 12).
function seedUnlocked() {
  window.localStorage.setItem(
    "gitway:progress:v1:director",
    JSON.stringify({ completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], current: 12, xp: 720, streak: 0, trKnown: [] }),
  );
}

function openFirstClaudeLesson() {
  seedUnlocked();
  render(<GitWayApp />);
  fireEvent.click(screen.getByText("Директор"));
  // клік по вузлу першого уроку курсу Claude (id 12)
  const title = screen.getByText("Що таке Claude Code і навіщо він потрібен");
  const btn = title.parentElement!.querySelector("button");
  fireEvent.click(btn!);
}

describe("CLI-урок: реальний контент + командний квіз", () => {
  it("показує опис і аудіо, без порожнього відео-слоту, потім веде до тесту", () => {
    openFirstClaudeLesson();
    // на сторінці уроку є номер у межах курсу
    expect(screen.getByText(/Урок 1 з 12/)).toBeTruthy();
    // реальний опис із файлу
    expect(screen.getByText(/інструмент від компанії/)).toBeTruthy();
    // порожнього відео-слоту немає (відео поки не додано)
    expect(screen.queryByText("Відео-слот")).toBeNull();
    // блоковий рендер: зведення команд уроку + інлайн-підсвітка тієї ж команди в тексті
    expect(screen.getByText("Команди цього уроку")).toBeTruthy();
    expect(screen.getAllByText(/claude auth login/).length).toBeGreaterThanOrEqual(2);
    // кнопка переходу до тесту
    expect(screen.getByText(/пройти квіз/)).toBeTruthy();
  });

  it("змішаний квіз: перше питання — вибір відповіді, правильний варіант зараховується", () => {
    openFirstClaudeLesson();
    fireEvent.click(screen.getByText(/пройти квіз/)); // startQuiz
    // питання 1 — з вибором
    expect(screen.getByText(/Оберіть правильну команду/)).toBeTruthy();
    // клікаємо правильний варіант (офіційний install-скрипт)
    fireEvent.click(screen.getByText(/curl -fsSL https:\/\/claude\.ai\/install\.sh/));
    expect(screen.getByText(/Правильно!/)).toBeTruthy();
    expect(screen.getByText(/нативний інсталятор/)).toBeTruthy(); // пояснення з файлу
  });

  it("змішаний квіз: друге питання — з введенням команди", () => {
    openFirstClaudeLesson();
    fireEvent.click(screen.getByText(/пройти квіз/));
    // відповідаємо на питання 1 (вибір) і переходимо далі
    fireEvent.click(screen.getByText(/curl -fsSL https:\/\/claude\.ai\/install\.sh/));
    fireEvent.click(screen.getByText(/Наступне питання/));
    // питання 2 — введення команди (Homebrew)
    const inp = screen.getByLabelText("Поле введення команди") as HTMLInputElement;
    fireEvent.change(inp, { target: { value: "brew install --cask claude-code" } });
    fireEvent.click(screen.getByText(/Перевірити/));
    expect(screen.getByText(/Правильно!/)).toBeTruthy();
  });
});
