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
  it("показує аудіо, опис і слот відео, потім веде до тесту", () => {
    openFirstClaudeLesson();
    // на сторінці уроку є номер у межах курсу
    expect(screen.getByText(/Урок 1 з 12/)).toBeTruthy();
    // реальний опис із файлу
    expect(screen.getByText(/інструмент від компанії/)).toBeTruthy();
    // слот відео (реального mp4 ще нема)
    expect(screen.getByText("Відео-слот")).toBeTruthy();
    // кнопка переходу до тесту
    expect(screen.getByText(/пройти квіз/)).toBeTruthy();
  });

  it("командний квіз приймає правильну команду і показує пояснення", () => {
    openFirstClaudeLesson();
    fireEvent.click(screen.getByText(/пройти квіз/)); // startQuiz
    const inp = screen.getByLabelText("Поле введення команди") as HTMLInputElement;
    fireEvent.change(inp, { target: { value: "curl -fsSL https://claude.ai/install.sh | bash" } });
    fireEvent.click(screen.getByText(/Перевірити/));
    expect(screen.getByText(/Правильно!/)).toBeTruthy();
    expect(screen.getByText(/нативний інсталятор/)).toBeTruthy(); // пояснення з файлу
  });

  it("невірна команда позначається як неправильна, але показує пояснення", () => {
    openFirstClaudeLesson();
    fireEvent.click(screen.getByText(/пройти квіз/));
    const inp = screen.getByLabelText("Поле введення команди") as HTMLInputElement;
    fireEvent.change(inp, { target: { value: "git init" } });
    fireEvent.click(screen.getByText(/Перевірити/));
    expect(screen.getByText(/Не зовсім/)).toBeTruthy();
  });
});
