import { describe, it, expect } from "vitest";
import { newWs, run, text, fixedClock } from "./_helpers";
import { currentRepo, repoByName } from "../workspace";

function seedOrigin() {
  const ws = newWs();
  const clock = fixedClock();
  ws.cwd = "/home/user/origin";
  ws.looseDirs.push("/home/user/origin");
  run(ws, clock, "git init", "echo hi > a.txt", "git add a.txt", 'git commit -m "init"');
  return { ws, clock };
}

describe("clone / push / pull", () => {
  it("клонує репозиторій у робочому просторі", () => {
    const { ws, clock } = seedOrigin();
    ws.cwd = "/home/user";
    const res = run(ws, clock, "git clone origin work");
    expect(text(res)).toContain("Cloning into 'work'");
    const work = repoByName(ws, "work")!;
    expect(work.workdir.files["a.txt"]).toBe("hi\n");
    expect(work.remotes["origin"]).toBeTruthy();
  });

  it("push оновлює віддалений репозиторій; pull приносить зміни", () => {
    const { ws, clock } = seedOrigin();
    ws.cwd = "/home/user";
    run(ws, clock, "git clone origin work");
    // працюємо в клоні
    ws.cwd = "/home/user/work";
    run(ws, clock, "echo more > b.txt", "git add b.txt", 'git commit -m "add b"');
    const pushRes = run(ws, clock, "git push origin main");
    expect(pushRes.code).toBe(0);
    // origin тепер має ту саму вершину, що й work
    const origin = repoByName(ws, "origin")!;
    const work = repoByName(ws, "work")!;
    expect(origin.branches["main"]).toBe(work.branches["main"]);

    // Другий клон робить pull
    ws.cwd = "/home/user";
    run(ws, clock, "git clone origin work2");
    ws.cwd = "/home/user/work2";
    expect(currentRepo(ws)!.workdir.files["b.txt"]).toBe("more\n");
  });

  it("відхиляє non-fast-forward push", () => {
    const { ws, clock } = seedOrigin();
    ws.cwd = "/home/user";
    run(ws, clock, "git clone origin work");
    // розходимось: коміт напряму в origin
    ws.cwd = "/home/user/origin";
    run(ws, clock, "echo x > c.txt", "git add c.txt", 'git commit -m "origin diverge"');
    // і в клоні
    ws.cwd = "/home/user/work";
    run(ws, clock, "echo y > d.txt", "git add d.txt", 'git commit -m "work diverge"');
    const res = run(ws, clock, "git push origin main");
    expect(res.code).toBe(1);
    expect(text(res)).toContain("rejected");
  });
});
