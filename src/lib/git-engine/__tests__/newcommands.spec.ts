import { describe, it, expect } from "vitest";
import { newWs, fixedClock, run, text } from "./_helpers";
import type { Workspace } from "../types";

/** Репо з двома комітами: a.txt("aaa") -> b.txt("bbb"). */
function twoCommits(): { ws: Workspace; clock: () => number } {
  const ws = newWs();
  const clock = fixedClock();
  run(
    ws,
    clock,
    "git init",
    "echo aaa > a.txt",
    "git add a.txt",
    "git commit -m first",
    "echo bbb > b.txt",
    "git add b.txt",
    "git commit -m second",
  );
  return { ws, clock };
}

describe("синтаксис ревізій", () => {
  it("HEAD~1 і HEAD^ вказують на попередній коміт", () => {
    const { ws, clock } = twoCommits();
    expect(text(run(ws, clock, "git show HEAD~1"))).toContain("first");
    expect(text(run(ws, clock, "git show HEAD^"))).toContain("first");
    expect(text(run(ws, clock, "git show HEAD"))).toContain("second");
  });
  it("reset HEAD~1 повертає гілку на коміт назад", () => {
    const { ws, clock } = twoCommits();
    run(ws, clock, "git reset --hard HEAD~1");
    const log = text(run(ws, clock, "git log --oneline"));
    expect(log).toContain("first");
    expect(log).not.toContain("second");
  });
});

describe("git tag", () => {
  it("створює, показує, видаляє теги; тег видно у log", () => {
    const { ws, clock } = twoCommits();
    run(ws, clock, "git tag v1");
    run(ws, clock, "git tag v0 HEAD~1");
    expect(text(run(ws, clock, "git tag"))).toContain("v1");
    expect(text(run(ws, clock, "git show v0"))).toContain("first");
    expect(text(run(ws, clock, "git log --oneline"))).toContain("tag: v1");
    run(ws, clock, "git tag -d v0");
    expect(text(run(ws, clock, "git tag"))).not.toContain("v0");
  });
});

describe("git show", () => {
  it("показує заголовок, повідомлення і diff коміту", () => {
    const { ws, clock } = twoCommits();
    const out = text(run(ws, clock, "git show HEAD"));
    expect(out).toContain("commit ");
    expect(out).toContain("Author:");
    expect(out).toContain("second");
    expect(out).toContain("b.txt");
    expect(out).toContain("+bbb");
  });
});

describe("git restore", () => {
  it("повертає файл робочої теки до збереженого стану", () => {
    const { ws, clock } = twoCommits();
    run(ws, clock, "echo changed > a.txt");
    expect(text(run(ws, clock, "cat a.txt"))).toContain("changed");
    run(ws, clock, "git restore a.txt");
    const after = text(run(ws, clock, "cat a.txt"));
    expect(after).toContain("aaa");
    expect(after).not.toContain("changed");
  });
  it("--staged знімає файл зі staging", () => {
    const { ws, clock } = twoCommits();
    run(ws, clock, "echo more > a.txt", "git add a.txt");
    expect(text(run(ws, clock, "git status --short"))).toContain("M");
    run(ws, clock, "git restore --staged a.txt");
    const st = text(run(ws, clock, "git status --short"));
    expect(st).toContain(" M a.txt"); // змінено, але не застейджено
  });
});

describe("git revert", () => {
  it("створює коміт, що скасовує зміни", () => {
    const { ws, clock } = twoCommits();
    run(ws, clock, "git revert HEAD");
    // b.txt додавався у 'second' — після revert його не має бути
    expect(text(run(ws, clock, "cat b.txt"))).toContain("No such file");
    expect(text(run(ws, clock, "git log --oneline"))).toContain("Revert");
  });
});

describe("git cherry-pick", () => {
  it("переносить коміт з іншої гілки", () => {
    const { ws, clock } = twoCommits();
    run(ws, clock, "git checkout -b feature", "echo ccc > c.txt", "git add c.txt", "git commit -m addc");
    run(ws, clock, "git checkout main", "git cherry-pick feature");
    expect(text(run(ws, clock, "cat c.txt"))).toContain("ccc");
    expect(text(run(ws, clock, "git log --oneline"))).toContain("addc");
  });
});

describe("git rm", () => {
  it("видаляє файл з робочої теки та індексу", () => {
    const { ws, clock } = twoCommits();
    const out = text(run(ws, clock, "git rm a.txt"));
    expect(out).toContain("rm 'a.txt'");
    expect(text(run(ws, clock, "cat a.txt"))).toContain("No such file");
    expect(text(run(ws, clock, "git status --short"))).toContain("D  a.txt");
  });
  it("--cached лишає файл, але прибирає з індексу", () => {
    const { ws, clock } = twoCommits();
    run(ws, clock, "git rm --cached a.txt");
    expect(text(run(ws, clock, "cat a.txt"))).toContain("aaa");
    expect(text(run(ws, clock, "git status --short"))).toContain("D  a.txt");
  });
});

describe("git clean", () => {
  it("без -f відмовляється, з -f видаляє untracked", () => {
    const { ws, clock } = twoCommits();
    run(ws, clock, "echo junk > junk.txt");
    expect(text(run(ws, clock, "git clean"))).toContain("refusing to clean");
    expect(text(run(ws, clock, "git clean -n"))).toContain("Would remove junk.txt");
    run(ws, clock, "git clean -f");
    expect(text(run(ws, clock, "cat junk.txt"))).toContain("No such file");
  });
});

describe("git reflog", () => {
  it("містить записи про коміти й переміщення HEAD", () => {
    const { ws, clock } = twoCommits();
    run(ws, clock, "git checkout -b dev");
    const out = text(run(ws, clock, "git reflog"));
    expect(out).toContain("HEAD@{0}");
    expect(out).toMatch(/checkout: moving from main to dev/);
    expect(out).toContain("commit: second");
  });
});

describe("git commit --amend", () => {
  it("переписує останній коміт, не додаючи новий", () => {
    const { ws, clock } = twoCommits();
    run(ws, clock, "git commit --amend -m second-amended");
    const log = text(run(ws, clock, "git log --oneline"));
    expect(log).toContain("second-amended");
    expect(log).not.toContain(" second\n");
    // усього досі 2 коміти
    expect(log.trim().split("\n").length).toBe(2);
  });
});

describe("git stash (drop / індекс)", () => {
  it("ховає зміни, list/pop повертають їх, drop прибирає", () => {
    const { ws, clock } = twoCommits();
    run(ws, clock, "echo wip > a.txt");
    run(ws, clock, "git stash");
    expect(text(run(ws, clock, "cat a.txt"))).toContain("aaa"); // повернуто до HEAD
    expect(text(run(ws, clock, "git stash list"))).toContain("stash@{0}");
    run(ws, clock, "git stash pop");
    expect(text(run(ws, clock, "cat a.txt"))).toContain("wip");
    // ще раз сховати й викинути
    run(ws, clock, "echo wip2 > a.txt", "git stash");
    run(ws, clock, "git stash drop");
    expect(text(run(ws, clock, "git stash list"))).not.toContain("stash@{0}");
  });
});

describe("git log --graph", () => {
  it("додає графову колонку", () => {
    const { ws, clock } = twoCommits();
    const out = text(run(ws, clock, "git log --graph --oneline"));
    expect(out.split("\n").every((l) => l.startsWith("* "))).toBe(true);
  });
});
