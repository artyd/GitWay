// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import GitWayApp from "./GitWayApp";
import { mockApi, login, type Seed } from "./test-helpers";

// Урок 1 (класичний MCQ) уже пройдено — перевіряємо, що повторне проходження
// НЕ нараховує XP ще раз (баг з подвійним нарахуванням).
let seeded: Seed = null;
afterEach(cleanup);
beforeEach(() => {
  seeded = { completed: [1], current: 2, xp: 160 };
  mockApi(() => seeded);
});

async function openLesson1AndFinishQuiz() {
  render(<GitWayApp />);
  login();
  // урок зʼявляється після підтягування прогресу з сервера (мок)
  const title = await screen.findByText("Що таке Git?");
  const card = title.closest("button") ?? title.parentElement!.querySelector("button");
  fireEvent.click(card!);
  // сторінка уроку → почати квіз
  fireEvent.click(await screen.findByText(/пройти квіз/));
  // 3 питання, усі правильні відповіді
  fireEvent.click(screen.getByText("Проєкт цілком, з усією історією змін"));
  fireEvent.click(screen.getByText(/Наступне питання/));
  fireEvent.click(screen.getByText("Один збережений «знімок» змін з описом"));
  fireEvent.click(screen.getByText(/Наступне питання/));
  fireEvent.click(screen.getByText("Щоб пробувати нове, не чіпаючи стабільну версію"));
  fireEvent.click(screen.getByText(/Завершити урок/));
}

describe("Повторне проходження пройденого уроку не додає XP", () => {
  it("показує '0 XP цього разу' і пояснення, а не нове нарахування", async () => {
    await openLesson1AndFinishQuiz();
    expect(screen.getByText(/Урок уже пройдено/)).toBeTruthy();
    expect(screen.getByText(/бали за нього нараховуються лише один раз/)).toBeTruthy();
    expect(screen.getByText("XP цього разу")).toBeTruthy();
  });
});
