import { describe, it, expect } from "vitest";
import { newWs, run, text, fixedClock } from "./_helpers";
import { currentRepo } from "../workspace";
import { computeGraph } from "../graph";
import { createPullRequest, mergePullRequest, prCommits, addPrReview } from "../pulls";
import { headCommitOid, readCommit } from "../objects";

describe("повний сеанс терміналу", () => {
  it("проходить типовий робочий процес і дає коректний вивід", () => {
    const ws = newWs();
    const clock = fixedClock();
    ws.cwd = "/home/user";

    run(ws, clock, "mkdir site", "cd site", "git init");
    expect(text(run(ws, clock, "pwd"))).toBe("/home/user/site");

    run(ws, clock, "echo hello > index.html", "echo body > style.css");
    const stTxt = text(run(ws, clock, "git status"));
    expect(stTxt).toContain("Untracked files");
    expect(stTxt).toContain("index.html");

    run(ws, clock, "git add .");
    expect(text(run(ws, clock, "git status"))).toContain("Changes to be committed");
    run(ws, clock, 'git commit -m "initial site"');

    // гілка + зміни
    run(ws, clock, "git switch -c feature", "echo nav > nav.html", "git add nav.html", 'git commit -m "add nav"');
    // повертаємось і зливаємо
    run(ws, clock, "git switch main");
    const mergeTxt = text(run(ws, clock, "git merge feature"));
    expect(mergeTxt).toContain("Fast-forward");
    expect(currentRepo(ws)!.workdir.files["nav.html"]).toBe("nav\n");

    // ls показує файли
    const lsTxt = text(run(ws, clock, "ls"));
    expect(lsTxt).toContain("index.html");
    expect(lsTxt).toContain("nav.html");

    // log має два коміти (fast-forward не додає merge-коміт)
    const logLines = text(run(ws, clock, "git log --oneline")).split("\n");
    expect(logLines.length).toBe(2);

    // cat працює
    expect(text(run(ws, clock, "cat index.html"))).toBe("hello");
  });

  it("реалістичні помилки", () => {
    const ws = newWs();
    const clock = fixedClock();
    expect(text(run(ws, clock, "git status"))).toContain("not a git repository");
    expect(text(run(ws, clock, "frobnicate"))).toContain("command not found");
    ws.cwd = "/home/user/x";
    ws.looseDirs.push("/home/user/x");
    run(ws, clock, "git init");
    expect(text(run(ws, clock, "git foo"))).toContain("is not a git command");
    expect(text(run(ws, clock, "cat missing.txt"))).toContain("No such file");
  });
});

describe("граф комітів", () => {
  it("призначає доріжки для гілки й злиття", () => {
    const ws = newWs();
    const clock = fixedClock();
    ws.cwd = "/home/user/g";
    ws.looseDirs.push("/home/user/g");
    run(ws, clock, "git init", "echo a > a", "git add a", 'git commit -m "c1"');
    run(ws, clock, "git checkout -b feat", "echo b > b", "git add b", 'git commit -m "c2"');
    run(ws, clock, "git checkout main", "echo c > c", "git add c", 'git commit -m "c3"');
    run(ws, clock, "git merge feat");
    const graph = computeGraph(currentRepo(ws)!);
    expect(graph.length).toBeGreaterThanOrEqual(4);
    // merge-коміт має двох батьків
    const mergeNode = graph.find((n) => n.commit.parents.length > 1);
    expect(mergeNode).toBeTruthy();
    expect(mergeNode!.parents.length).toBe(2);
  });
});

describe("pull requests", () => {
  function setup() {
    const ws = newWs();
    const clock = fixedClock();
    ws.cwd = "/home/user/pr";
    ws.looseDirs.push("/home/user/pr");
    run(ws, clock, "git init", "echo base > f.txt", "git add f.txt", 'git commit -m "base"');
    run(ws, clock, "git checkout -b feature", "echo feat > feat.txt", "git add feat.txt", 'git commit -m "feat work"');
    run(ws, clock, "git checkout main");
    return { ws, clock, repo: currentRepo(ws)! };
  }

  it("створює і зливає PR, оновлюючи цільову гілку", () => {
    const { clock, repo } = setup();
    const pr = createPullRequest(repo, "feature", "main", "Додаю фічу", "опис", "Рецензент", clock);
    expect("number" in pr).toBe(true);
    if ("error" in pr) throw new Error(pr.error);
    expect(prCommits(repo, pr).length).toBe(1);

    addPrReview(pr, "Колега", "approved", "гарно", clock);
    const outcome = mergePullRequest(repo, pr, clock);
    expect(outcome.ok).toBe(true);
    expect(pr.state).toBe("merged");
    // main тепер містить feat.txt
    const head = headCommitOid(repo)!;
    expect(readCommit(repo, head)).toBeTruthy();
    expect(repo.workdir.files["feat.txt"]).toBe("feat\n");
  });

  it("не зливає PR із конфліктом", () => {
    const { ws, clock, repo } = setup();
    // робимо конфліктну зміну на main
    run(ws, clock, "echo mainside > feat.txt", "git add feat.txt", 'git commit -m "conflict on main"');
    // на feature той самий файл інший
    const pr = createPullRequest(repo, "feature", "main", "Фіча", "", "Рецензент", clock);
    if ("error" in pr) throw new Error(pr.error);
    const outcome = mergePullRequest(repo, pr, clock);
    expect(outcome.ok).toBe(false);
    expect(pr.state).toBe("open");
  });
});
