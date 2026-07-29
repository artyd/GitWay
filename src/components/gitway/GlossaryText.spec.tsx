// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GlossaryText } from "./GlossaryText";

afterEach(cleanup);

describe("GlossaryText — підказки до складних слів", () => {
  it("обгортає термін у клікабельний елемент і показує пояснення", () => {
    render(<GlossaryText text="Потрібно зробити рефакторинг цього модуля." accent="#0f9c8c" />);
    const btn = screen.getByRole("button", { name: /рефакторинг/i });
    expect(btn).toBeTruthy();
    // до кліку підказки немає
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(btn);
    const tip = screen.getByRole("tooltip");
    expect(tip.textContent).toMatch(/чистішим і зрозумілішим/);
  });

  it("звичайний текст без термінів лишається рядком", () => {
    const { container } = render(<GlossaryText text="Просто звичайний рядок тексту." accent="#0f9c8c" />);
    expect(container.textContent).toBe("Просто звичайний рядок тексту.");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
