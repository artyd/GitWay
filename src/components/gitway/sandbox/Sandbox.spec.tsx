// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { GitEngine } from "@/lib/git-engine/store";
import { createSeedWorkspace } from "@/lib/git-engine/seed";
import { Terminal } from "./Terminal";
import { GitHubClone } from "./GitHubClone";

function makeEngine() {
  return new GitEngine(createSeedWorkspace("тест", Date.now), Date.now);
}

afterEach(cleanup);

describe("Terminal (UI)", () => {
  it("виконує команду й показує вивід у скролбеку", () => {
    const engine = makeEngine();
    render(<Terminal backend={engine} account="тест" />);
    const input = screen.getByLabelText("Командний рядок терміналу") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "git status" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // після Enter має зʼявитися рядок стану
    expect(screen.getByText(/On branch main/)).toBeTruthy();
    expect(input.value).toBe("");
  });

  it("команда з терміналу відображається у моделі рушія", () => {
    const engine = makeEngine();
    render(<Terminal backend={engine} account="тест" />);
    const input = screen.getByLabelText("Командний рядок терміналу") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "echo привіт > note.txt" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(engine.repo()!.workdir.files["note.txt"]).toBe("привіт\n");
  });
});

describe("GitHubClone (UI) — синхронізація з рушієм", () => {
  it("показує коміти демо-репозиторію", () => {
    const engine = makeEngine();
    render(<GitHubClone engine={engine} account="тест" />);
    // перемикаємось на вкладку Коміти
    fireEvent.click(screen.getByText("Коміти"));
    expect(screen.getByText(/Додаю бюджет/)).toBeTruthy();
    expect(screen.getByText(/Початковий план/)).toBeTruthy();
  });

  it("staging із UI змінює git status рушія", () => {
    const engine = makeEngine();
    // створюємо незакомічену зміну через рушій
    engine.exec("echo зміна > README.md");
    render(<GitHubClone engine={engine} account="тест" />);
    fireEvent.click(screen.getByText("Зміни"));
    // README.md має бути серед незапроіндексованих; тиснемо «Проіндексувати все»
    fireEvent.click(screen.getByText(/Проіндексувати все/));
    const st = engine.statusOf(engine.repo()!);
    expect(st.staged.some((s) => s.path === "README.md")).toBe(true);
    expect(st.unstaged.length).toBe(0);
  });

  it("створення гілки з UI зʼявляється у рушії", () => {
    const engine = makeEngine();
    render(<GitHubClone engine={engine} account="тест" />);
    fireEvent.click(screen.getByText("Гілки"));
    const input = screen.getByPlaceholderText("нова-гілка") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "dev" } });
    fireEvent.click(screen.getByText(/Створити/));
    expect(Object.keys(engine.repo()!.branches)).toContain("dev");
    expect(engine.repo()!.head).toEqual({ type: "branch", branch: "dev" });
  });
});

describe("Двобічна синхронізація терміналу і GitHub", () => {
  it("коміт у терміналі зʼявляється у списку комітів GitHub", () => {
    const engine = makeEngine();
    const view = render(<GitHubClone engine={engine} account="тест" />);
    engine.exec("echo нове > feature.txt");
    engine.exec("git add feature.txt");
    engine.exec('git commit -m "нова фіча з терміналу"');
    fireEvent.click(within(view.container).getByText("Коміти"));
    expect(screen.getByText(/нова фіча з терміналу/)).toBeTruthy();
  });
});
