// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CliPanel } from "./CliPanel";

afterEach(cleanup);

describe("CLI-вкладка (симулятор агентних CLI)", () => {
  it("виконує команду в симуляторі Claude через спільний Terminal", () => {
    render(<CliPanel account="тест" />);
    const input = screen.getByLabelText("Командний рядок терміналу") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "/init" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText(/Створено CLAUDE\.md/)).toBeTruthy();
    expect(input.value).toBe("");
  });

  it("перемикання інструмента показує банер Codex", () => {
    render(<CliPanel account="тест" />);
    // спершу Claude
    expect(screen.getByText(/Claude Code \(симуляція\)/)).toBeTruthy();
    fireEvent.click(screen.getByText("Codex CLI"));
    expect(screen.getByText(/OpenAI Codex CLI \(симуляція\)/)).toBeTruthy();
  });

  it("невідома команда дає підказку", () => {
    render(<CliPanel account="тест" />);
    const input = screen.getByLabelText("Командний рядок терміналу") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "/xyz" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText(/Невідома команда/)).toBeTruthy();
  });
});
