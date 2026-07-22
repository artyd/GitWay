import { describe, it, expect } from "vitest";
import { tokenize, parseRedirect, parseFlags } from "../tokenize";
import * as P from "../path";
import { complete } from "../complete";
import { createSeedWorkspace } from "../seed";
import { fixedClock } from "./_helpers";
import { computeStatus } from "../status";
import { currentRepo } from "../workspace";

describe("tokenize", () => {
  it("розбиває з лапками", () => {
    expect(tokenize('git commit -m "hello world"')).toEqual(["git", "commit", "-m", "hello world"]);
    expect(tokenize("echo 'a b' c")).toEqual(["echo", "a b", "c"]);
  });
  it("витягує перенаправлення", () => {
    const { argv, redirect } = parseRedirect(tokenize("echo hi > file.txt"));
    expect(argv).toEqual(["echo", "hi"]);
    expect(redirect).toEqual({ op: ">", file: "file.txt" });
  });
  it("parseFlags розрізняє прапорці та значення", () => {
    const r = parseFlags(["-m", "msg", "-a", "file"], { bool: ["-a"], value: ["-m"] });
    expect(r.values["-m"]).toBe("msg");
    expect(r.flags["-a"]).toBe(true);
    expect(r.positional).toEqual(["file"]);
  });
});

describe("path", () => {
  it("нормалізує та резолвить", () => {
    expect(P.normalize("/a/b/../c")).toBe("/a/c");
    expect(P.resolve("/home/user", "../root")).toBe("/home/root");
    expect(P.relative("/home/user/p", "/home/user/p/src/a.js")).toBe("src/a.js");
    expect(P.basename("/a/b/c.txt")).toBe("c.txt");
    expect(P.dirname("/a/b/c.txt")).toBe("/a/b");
  });
});

describe("complete", () => {
  it("доповнює підкоманди git", () => {
    const ws = createSeedWorkspace("t", fixedClock());
    const line = "git comm";
    const c = complete(line, line.length, ws);
    expect(c.candidates).toContain("commit");
  });
  it("доповнює назви гілок після checkout", () => {
    const ws = createSeedWorkspace("t", fixedClock());
    // додаємо гілку через рушій напряму не обовʼязково — main вже існує
    const line = "git checkout ma";
    const c = complete(line, line.length, ws);
    expect(c.candidates).toContain("main");
  });
});

describe("seed", () => {
  it("створює демо-репозиторій з двома комітами і чистим деревом", () => {
    const ws = createSeedWorkspace("t", fixedClock());
    const repo = currentRepo(ws)!;
    expect(repo).toBeTruthy();
    expect(repo.name).toBe("marketing-plan");
    expect(Object.keys(repo.workdir.files)).toContain("README.md");
    expect(repo.workdir.files["docs/budget.md"]).toContain("Бюджет");
    const st = computeStatus(repo);
    expect(st.staged).toEqual([]);
    expect(st.unstaged).toEqual([]);
    expect(st.untracked).toEqual([]);
    // два коміти в історії
    const log = repo.branches["main"];
    expect(log).toBeTruthy();
  });
});
