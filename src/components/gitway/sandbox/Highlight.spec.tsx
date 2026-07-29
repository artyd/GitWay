// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Terminal } from "./Terminal";
import { gitHighlight } from "@/lib/git-engine/highlight";
import { GitEngine } from "@/lib/git-engine/store";
import { freshWorkspace } from "@/lib/git-engine/workspace";

afterEach(cleanup);

function makeTerminal() {
  let t = 1_700_000_000_000;
  const clock = () => (t += 1000);
  const engine = new GitEngine(freshWorkspace("t"), clock);
  return render(
    <Terminal backend={engine} account="test" highlightLine={gitHighlight} />,
  );
}

describe("Підсвітка вводу в терміналі", () => {
  it("оверлей відображає введену команду токенами, а текст інпуту прозорий", () => {
    const { container } = makeTerminal();
    const input = screen.getByLabelText("Командний рядок терміналу") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "git status" } });

    // інпут — прозорий текст (видно лише каретку), підсвітку малює оверлей
    expect(input.getAttribute("style")).toMatch(/color:\s*transparent/);

    // оверлей (aria-hidden) містить увесь текст рядка
    const overlay = container.querySelector('[data-hl-overlay]');
    expect(overlay).toBeTruthy();
    expect(overlay!.textContent).toBe("git status");

    // токени пофарбовані (є span з інлайн-color)
    const colored = Array.from(overlay!.querySelectorAll("span")).filter((s) =>
      /color:/.test(s.getAttribute("style") ?? ""),
    );
    expect(colored.length).toBeGreaterThan(0);
  });

  it("невідома команда фарбується інакше, ніж відома (git)", () => {
    const { container } = makeTerminal();
    const input = screen.getByLabelText("Командний рядок терміналу") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "git" } });
    const overlay = container.querySelector('[data-hl-overlay]')!;
    const gitColor = overlay.querySelector("span")!.getAttribute("style");

    fireEvent.change(input, { target: { value: "zzz" } });
    const badColor = container.querySelector('[data-hl-overlay]')!.querySelector("span")!.getAttribute("style");

    expect(gitColor).not.toBe(badColor);
  });
});
