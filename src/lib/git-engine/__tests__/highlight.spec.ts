import { describe, it, expect } from "vitest";
import { gitHighlight } from "../highlight";
import { complete } from "../complete";
import { newWs, fixedClock, run } from "./_helpers";

describe("gitHighlight", () => {
  it("зберігає весь текст (сума токенів == рядок)", () => {
    const line = 'git commit -m "hello world" file.txt';
    const toks = gitHighlight(line);
    expect(toks.map((t) => t.text).join("")).toBe(line);
  });
  it("валідна команда й підкоманда — різні кольори від невалідних", () => {
    const okCmd = gitHighlight("git status");
    const badSub = gitHighlight("git zzz");
    const gitColor = okCmd[0].color;
    const statusColor = okCmd.find((t) => t.text === "status")!.color;
    const zzzColor = badSub.find((t) => t.text === "zzz")!.color;
    expect(gitColor).not.toBe(""); // git — валідна
    expect(statusColor).not.toBe(zzzColor); // валідна vs невалідна підкоманда
  });
  it("невідома команда підсвічується інакше, ніж відома", () => {
    const good = gitHighlight("ls")[0].color;
    const bad = gitHighlight("nosuchcmd")[0].color;
    expect(good).not.toBe(bad);
  });
  it("прапорці мають окремий колір", () => {
    const toks = gitHighlight("git commit --amend");
    const flag = toks.find((t) => t.text === "--amend")!;
    const cmd = toks.find((t) => t.text === "git")!;
    expect(flag.color).not.toBe(cmd.color);
  });
});

describe("автодоповнення нових команд і прапорців", () => {
  it("доповнює нові підкоманди git (rev-, cherry-)", () => {
    const ws = newWs();
    const c1 = complete("git rev", 7, ws);
    expect(c1.candidates).toContain("revert");
    const c2 = complete("git che", 7, ws);
    expect(c2.candidates).toContain("cherry-pick");
  });
  it("доповнює прапорці підкоманди", () => {
    const ws = newWs();
    const clock = fixedClock();
    run(ws, clock, "git init");
    const c = complete("git commit --a", 14, ws);
    expect(c.candidates).toContain("--amend");
  });
  it("доповнює назви тегів для show", () => {
    const ws = newWs();
    const clock = fixedClock();
    run(ws, clock, "git init", "echo x > a.txt", "git add a.txt", "git commit -m c", "git tag v1");
    const c = complete("git show v", 10, ws);
    expect(c.candidates).toContain("v1");
  });
});
