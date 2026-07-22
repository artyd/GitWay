import { describe, it, expect } from "vitest";
import { merge3 } from "../merge";
import { newWs, run, text, fixedClock } from "./_helpers";
import { currentRepo } from "../workspace";
import { computeStatus } from "../status";

describe("merge3", () => {
  it("бере зміну однієї сторони без конфлікту", () => {
    const res = merge3("a\nb\nc\n", "a\nB\nc\n", "a\nb\nc\n", { ours: "HEAD", theirs: "feat" });
    expect(res.conflicts).toBe(0);
    expect(res.text).toBe("a\nB\nc\n");
  });

  it("позначає конфлікт, коли обидві сторони змінили той самий рядок", () => {
    const res = merge3("a\nb\nc\n", "a\nX\nc\n", "a\nY\nc\n", { ours: "HEAD", theirs: "feat" });
    expect(res.conflicts).toBe(1);
    expect(res.text).toContain("<<<<<<< HEAD");
    expect(res.text).toContain("=======");
    expect(res.text).toContain(">>>>>>> feat");
  });
});

function setup() {
  const ws = newWs();
  const clock = fixedClock();
  ws.cwd = "/home/user/p";
  ws.looseDirs.push("/home/user/p");
  run(ws, clock, "git init", "echo base > shared.txt", "git add shared.txt", 'git commit -m "base"');
  return { ws, clock };
}

describe("git merge", () => {
  it("fast-forward, коли гілка позаду", () => {
    const { ws, clock } = setup();
    run(ws, clock, "git checkout -b feature", "echo feat > f.txt", "git add f.txt", 'git commit -m "feat"');
    run(ws, clock, "git checkout main");
    const res = run(ws, clock, "git merge feature");
    expect(text(res)).toContain("Fast-forward");
    expect(currentRepo(ws)!.workdir.files["f.txt"]).toBe("feat\n");
  });

  it("тристороннє злиття без конфлікту створює merge-коміт", () => {
    const { ws, clock } = setup();
    run(ws, clock, "git checkout -b feature", "echo feat > f.txt", "git add f.txt", 'git commit -m "feat"');
    run(ws, clock, "git checkout main", "echo main2 > m.txt", "git add m.txt", 'git commit -m "main2"');
    const res = run(ws, clock, "git merge feature");
    expect(text(res)).toContain("Merge made");
    const head = currentRepo(ws)!;
    expect(head.workdir.files["f.txt"]).toBe("feat\n");
    expect(head.workdir.files["m.txt"]).toBe("main2\n");
  });

  it("конфлікт злиття лишає маркери й блокує коміт", () => {
    const { ws, clock } = setup();
    run(ws, clock, "git checkout -b feature", "echo theirs > shared.txt", "git add shared.txt", 'git commit -m "feat"');
    run(ws, clock, "git checkout main", "echo ours > shared.txt", "git add shared.txt", 'git commit -m "main2"');
    const res = run(ws, clock, "git merge feature");
    expect(res.code).toBe(1);
    expect(text(res)).toContain("CONFLICT");
    const st = computeStatus(currentRepo(ws)!);
    expect(st.conflicts).toContain("shared.txt");
    expect(st.merging).toBe(true);
    expect(currentRepo(ws)!.workdir.files["shared.txt"]).toContain("<<<<<<<");
    // розвʼязуємо конфлікт
    run(ws, clock, "echo resolved > shared.txt", "git add shared.txt");
    const st2 = computeStatus(currentRepo(ws)!);
    expect(st2.conflicts).toEqual([]);
    const commitRes = run(ws, clock, 'git commit -m "resolve"');
    expect(commitRes.code).toBe(0);
    expect(currentRepo(ws)!.mergeHead).toBeUndefined();
  });
});
