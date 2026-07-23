// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import GitWayApp from "./GitWayApp";
import { mockApi, login, type Seed } from "./test-helpers";

// Розблоковано фазу 4: усі 11 базових уроків пройдено, поточний — 12.
let seeded: Seed = null;
afterEach(cleanup);
beforeEach(() => {
  seeded = { completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], current: 12, xp: 720 };
  mockApi(() => seeded);
});

async function openFirstClaudeLesson() {
  render(<GitWayApp />);
  login();
  // урок зʼявляється після підтягування прогресу з сервера (мок)
  const title = await screen.findByText("Що таке Claude Code і навіщо він потрібен");
  const btn = title.parentElement!.querySelector("button");
  fireEvent.click(btn!);
}

describe("CLI-урок: реальний контент + командний квіз", () => {
  it("показує опис і аудіо, без порожнього відео-слоту, потім веде до тесту", async () => {
    await openFirstClaudeLesson();
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

  it("кожне питання — з вибором; правильний варіант зараховується", async () => {
    await openFirstClaudeLesson();
    fireEvent.click(screen.getByText(/пройти квіз/)); // startQuiz
    expect(screen.getByText(/Оберіть правильну команду/)).toBeTruthy();
    // клікаємо правильний варіант (офіційний install-скрипт)
    fireEvent.click(screen.getByText(/curl -fsSL https:\/\/claude\.ai\/install\.sh/));
    expect(screen.getByText(/Правильно!/)).toBeTruthy();
    expect(screen.getByText(/нативний інсталятор/)).toBeTruthy(); // пояснення з файлу
  });

  it("ввід команди — додатковий спосіб відповісти (теж зараховується)", async () => {
    await openFirstClaudeLesson();
    fireEvent.click(screen.getByText(/пройти квіз/));
    // на першому ж питанні є і вибір, і поле введення
    expect(screen.getByText(/Знаєте напам'ять/)).toBeTruthy();
    const inp = screen.getByLabelText("Поле введення команди") as HTMLInputElement;
    fireEvent.change(inp, { target: { value: "curl -fsSL https://claude.ai/install.sh | bash" } });
    fireEvent.keyDown(inp, { key: "Enter" });
    expect(screen.getByText(/Правильно!/)).toBeTruthy();
  });
});
