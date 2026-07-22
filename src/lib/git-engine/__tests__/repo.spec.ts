import { describe, it, expect } from "vitest";
import { newWs, run, text, fixedClock } from "./_helpers";
import { currentRepo } from "../workspace";
import { computeStatus } from "../status";

describe("init / add / commit / log", () => {
  it("ініціалізує репозиторій і робить перший коміт", () => {
    const ws = newWs();
    const clock = fixedClock();
    ws.cwd = "/home/user/proj";
    ws.looseDirs.push("/home/user/proj");
    expect(text(run(ws, clock, "git init"))).toContain("Initialized empty Git repository");
    run(ws, clock, "echo hello > a.txt");
    const st1 = computeStatus(currentRepo(ws)!);
    expect(st1.untracked).toEqual(["a.txt"]);
    run(ws, clock, "git add a.txt");
    const st2 = computeStatus(currentRepo(ws)!);
    expect(st2.staged).toEqual([{ path: "a.txt", kind: "new" }]);
    const c = run(ws, clock, 'git commit -m "first"');
    expect(text(c)).toMatch(/\[main \(root-commit\) [0-9a-f]{7}\] first/);
    const st3 = computeStatus(currentRepo(ws)!);
    expect(st3.staged).toEqual([]);
    expect(st3.untracked).toEqual([]);
  });

  it("log показує коміти в зворотному хронологічному порядку", () => {
    const ws = newWs();
    const clock = fixedClock();
    ws.cwd = "/home/user/p";
    ws.looseDirs.push("/home/user/p");
    run(ws, clock, "git init", "echo 1 > a", "git add a", 'git commit -m "c1"');
    run(ws, clock, "echo 2 > b", "git add b", 'git commit -m "c2"');
    const log = text(run(ws, clock, "git log --oneline"));
    const lines = log.split("\n");
    expect(lines[0]).toContain("c2");
    expect(lines[1]).toContain("c1");
  });

  it("виявляє змінені та видалені файли", () => {
    const ws = newWs();
    const clock = fixedClock();
    ws.cwd = "/home/user/p";
    ws.looseDirs.push("/home/user/p");
    run(ws, clock, "git init", "echo one > a", "git add a", 'git commit -m "c1"');
    run(ws, clock, "echo two > a");
    let st = computeStatus(currentRepo(ws)!);
    expect(st.unstaged).toEqual([{ path: "a", kind: "modified" }]);
    run(ws, clock, "rm a");
    st = computeStatus(currentRepo(ws)!);
    expect(st.unstaged).toEqual([{ path: "a", kind: "deleted" }]);
  });
});

describe("branch / checkout", () => {
  it("створює гілку, перемикається і робить розбіжний коміт", () => {
    const ws = newWs();
    const clock = fixedClock();
    ws.cwd = "/home/user/p";
    ws.looseDirs.push("/home/user/p");
    run(ws, clock, "git init", "echo base > a", "git add a", 'git commit -m "base"');
    run(ws, clock, "git checkout -b feature");
    expect(currentRepo(ws)!.head).toEqual({ type: "branch", branch: "feature" });
    run(ws, clock, "echo feat > b", "git add b", 'git commit -m "feat"');
    run(ws, clock, "git checkout main");
    // файл b не має існувати на main
    expect(currentRepo(ws)!.workdir.files["b"]).toBeUndefined();
    run(ws, clock, "git checkout feature");
    expect(currentRepo(ws)!.workdir.files["b"]).toBe("feat\n");
  });
});
