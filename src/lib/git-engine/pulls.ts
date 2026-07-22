// Операції Pull Request поверх моделі репозиторію.

import type { Oid, PullRequest, Repo, Signature } from "./types";
import {
  headCommitOid,
  makeBlob,
  makeCommit,
  makeTree,
  readCommit,
  treeToFileMap,
} from "./objects";
import { loadTreeIntoWorkdir, commitTree, signature } from "./repo";
import { computeMerge } from "./merge";
import type { FileEntry } from "./types";

let commentSeq = 0;
function cid(clock: () => number): string {
  commentSeq++;
  return "c" + clock() + "-" + commentSeq;
}

export function createPullRequest(
  repo: Repo,
  source: string,
  target: string,
  title: string,
  body: string,
  author: string,
  clock: () => number,
): PullRequest | { error: string } {
  if (repo.branches[source] === undefined) return { error: "гілки '" + source + "' не існує" };
  if (repo.branches[target] === undefined) return { error: "гілки '" + target + "' не існує" };
  if (source === target) return { error: "гілки джерела й цілі збігаються" };
  const pr: PullRequest = {
    number: repo.nextPrNumber++,
    title: title || source + " → " + target,
    body,
    sourceBranch: source,
    targetBranch: target,
    state: "open",
    author,
    createdAt: clock(),
    comments: [],
    reviews: [],
  };
  repo.pullRequests.unshift(pr);
  return pr;
}

export function addPrComment(pr: PullRequest, author: string, body: string, clock: () => number): void {
  pr.comments.push({ id: cid(clock), author, body, when: clock() });
}

export function addPrReview(
  pr: PullRequest,
  author: string,
  verdict: "approved" | "changes_requested" | "commented",
  body: string,
  clock: () => number,
): void {
  pr.reviews.push({ id: cid(clock), author, verdict, body, when: clock() });
}

export function closePullRequest(pr: PullRequest): void {
  if (pr.state === "open") pr.state = "closed";
}

export interface MergeOutcome {
  ok: boolean;
  message: string;
  conflicts?: string[];
}

/** Зливає PR у цільову гілку. Оновлює робочу директорію, якщо ціль — поточна гілка. */
export function mergePullRequest(repo: Repo, pr: PullRequest, clock: () => number): MergeOutcome {
  if (pr.state !== "open") return { ok: false, message: "PR уже " + (pr.state === "merged" ? "злитий" : "закритий") };
  const ours = repo.branches[pr.targetBranch];
  const theirs = repo.branches[pr.sourceBranch];
  if (ours === undefined || theirs === undefined) return { ok: false, message: "гілку видалено" };

  const res = computeMerge(repo, ours, theirs, pr.sourceBranch);
  if (res.kind === "upToDate") {
    pr.state = "merged";
    return { ok: true, message: "Нема чого зливати — ціль уже містить зміни." };
  }
  const isCurrent = repo.head.type === "branch" && repo.head.branch === pr.targetBranch;

  if (res.kind === "ff") {
    repo.branches[pr.targetBranch] = theirs;
    if (isCurrent) loadTreeIntoWorkdir(repo, commitTree(repo, theirs));
    pr.state = "merged";
    return { ok: true, message: "Швидке злиття (fast-forward) виконано." };
  }
  if (res.kind === "conflict") {
    return { ok: false, message: "Конфлікти — злиття неможливе автоматично.", conflicts: res.conflicts };
  }
  // clean -> merge-коміт на цільовій гілці
  const sig: Signature = signature(repo, clock);
  const tree = buildTreeFromFiles(repo, res.mergedFiles);
  const msg = "Merge pull request #" + pr.number + " (" + pr.sourceBranch + " → " + pr.targetBranch + ")";
  const oid = makeCommit(repo, tree, [ours, theirs], sig, sig, msg);
  repo.branches[pr.targetBranch] = oid;
  if (isCurrent) loadTreeIntoWorkdir(repo, commitTree(repo, oid));
  pr.state = "merged";
  return { ok: true, message: "PR злито (merge-коміт " + oid.slice(0, 7) + ")." };
}

/** Будує дерево з плоскої мапи файлів (шлях->вміст). */
function buildTreeFromFiles(repo: Repo, files: Record<string, string>): Oid {
  type Node = { blobs: Record<string, Oid>; dirs: Record<string, Node> };
  const root: Node = { blobs: {}, dirs: {} };
  for (const path of Object.keys(files)) {
    const parts = path.split("/");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      node.dirs[parts[i]] ??= { blobs: {}, dirs: {} };
      node = node.dirs[parts[i]];
    }
    node.blobs[parts[parts.length - 1]] = makeBlob(repo, files[path]);
  }
  const write = (node: Node): Oid => {
    const entries: FileEntry[] = [];
    for (const name of Object.keys(node.blobs))
      entries.push({ name, mode: "100644", kind: "blob", oid: node.blobs[name] });
    for (const name of Object.keys(node.dirs))
      entries.push({ name, mode: "040000", kind: "tree", oid: write(node.dirs[name]) });
    return makeTree(repo, entries);
  };
  return write(root);
}

/** Кількість комітів у PR (source, яких немає в target). */
export function prCommits(repo: Repo, pr: PullRequest): Oid[] {
  const target = repo.branches[pr.targetBranch];
  const source = repo.branches[pr.sourceBranch];
  if (source === undefined) return [];
  const targetAnc = target ? ancestorSet(repo, target) : new Set<Oid>();
  const out: Oid[] = [];
  const stack = [source];
  const seen = new Set<Oid>();
  while (stack.length) {
    const oid = stack.pop()!;
    if (seen.has(oid) || targetAnc.has(oid)) continue;
    seen.add(oid);
    out.push(oid);
    const c = readCommit(repo, oid);
    if (c) for (const p of c.parents) stack.push(p);
  }
  return out;
}

function ancestorSet(repo: Repo, oid: Oid): Set<Oid> {
  const seen = new Set<Oid>();
  const stack = [oid];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const c = readCommit(repo, cur);
    if (c) for (const p of c.parents) stack.push(p);
  }
  return seen;
}

/** Дерева двох вершин PR для diff (base = target tip, head = source tip). */
export function prDiffTrees(repo: Repo, pr: PullRequest): { base: Oid | null; head: Oid | null } {
  const target = repo.branches[pr.targetBranch];
  const source = repo.branches[pr.sourceBranch];
  void headCommitOid;
  void treeToFileMap;
  return {
    base: target ? commitTree(repo, target) : null,
    head: source ? commitTree(repo, source) : null,
  };
}
