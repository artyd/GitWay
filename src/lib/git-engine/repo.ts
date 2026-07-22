// Операції високого рівня над одним репозиторієм: init, add, commit, checkout, branch.

import type { Commit, Index, Oid, Repo, Signature } from "./types";
import {
  blobOid,
  buildTreeFromIndex,
  headCommit,
  headCommitOid,
  makeBlob,
  makeCommit,
  readCommit,
  treeToFileMap,
  treeToMap,
} from "./objects";

export function initRepo(repo: Repo, clock: () => number, defaultBranch = "main"): void {
  repo.initialized = true;
  repo.config.defaultBranch = defaultBranch;
  repo.head = { type: "branch", branch: defaultBranch };
  void clock;
}

export function signature(repo: Repo, clock: () => number): Signature {
  return { name: repo.config.userName, email: repo.config.userEmail, when: clock() };
}

/** Додає один файл робочої директорії до індексу. */
export function stageFile(repo: Repo, rel: string): boolean {
  const content = repo.workdir.files[rel];
  if (content === undefined) return false;
  const oid = makeBlob(repo, content);
  repo.index[rel] = { path: rel, oid, mode: "100644" };
  return true;
}

/** Видаляє шлях з індексу, якщо файл прибрано з робочої директорії (git add на видалення). */
export function stageDeletion(repo: Repo, rel: string): void {
  delete repo.index[rel];
}

/** git add <шлях або каталог>: стейджить усі файли під префіксом + видалення. */
export function stagePathspec(repo: Repo, rel: string): number {
  let n = 0;
  const isDir = rel === "." || rel === "";
  const prefix = isDir ? "" : rel + "/";
  for (const p of Object.keys(repo.workdir.files)) {
    if (isDir || p === rel || p.startsWith(prefix)) {
      stageFile(repo, p);
      n++;
    }
  }
  // видалені файли (є в індексі, немає в робочій директорії)
  for (const p of Object.keys(repo.index)) {
    if ((isDir || p === rel || p.startsWith(prefix)) && repo.workdir.files[p] === undefined) {
      stageDeletion(repo, p);
      n++;
    }
  }
  return n;
}

/** Скидає шлях в індексі до стану HEAD (git reset <шлях> / unstage). */
export function unstagePath(repo: Repo, rel: string): void {
  const head = headCommit(repo);
  const headMap = treeToMap(repo, head ? head.tree : null);
  if (headMap[rel]) repo.index[rel] = { path: rel, oid: headMap[rel], mode: "100644" };
  else delete repo.index[rel];
}

export function createCommit(repo: Repo, message: string, clock: () => number): Oid {
  const tree = buildTreeFromIndex(repo, repo.index);
  const headOid = headCommitOid(repo);
  const parents: Oid[] = [];
  if (headOid) parents.push(headOid);
  if (repo.mergeHead) parents.push(repo.mergeHead);
  const sig = signature(repo, clock);
  const oid = makeCommit(repo, tree, parents, sig, sig, message);
  if (repo.head.type === "branch") repo.branches[repo.head.branch] = oid;
  else repo.head = { type: "detached", oid };
  repo.mergeHead = undefined;
  repo.mergeMessage = undefined;
  return oid;
}

/** Робить workdir+index ідентичними дереву коміту. */
export function loadTreeIntoWorkdir(repo: Repo, treeOid: Oid | null): void {
  const files = treeToFileMap(repo, treeOid);
  repo.workdir.files = { ...files };
  const index: Index = {};
  const map = treeToMap(repo, treeOid);
  for (const p of Object.keys(map)) index[p] = { path: p, oid: map[p], mode: "100644" };
  repo.index = index;
}

/** Перемикання на гілку: HEAD -> branch, робоча директорія = дерево вершини. */
export function checkoutBranch(repo: Repo, branch: string): boolean {
  if (repo.branches[branch] === undefined) return false;
  repo.head = { type: "branch", branch };
  loadTreeIntoWorkdir(repo, commitTree(repo, repo.branches[branch]));
  return true;
}

/** Перемикання на конкретний коміт (detached HEAD). */
export function checkoutCommit(repo: Repo, oid: Oid): boolean {
  if (!readCommit(repo, oid)) return false;
  repo.head = { type: "detached", oid };
  loadTreeIntoWorkdir(repo, commitTree(repo, oid));
  return true;
}

export function commitTree(repo: Repo, oid: Oid | null): Oid | null {
  if (!oid) return null;
  const c = readCommit(repo, oid);
  return c ? c.tree : null;
}

export function createBranch(repo: Repo, name: string, at?: Oid): boolean {
  if (repo.branches[name] !== undefined) return false;
  const oid = at ?? headCommitOid(repo);
  if (!oid) return false;
  repo.branches[name] = oid;
  return true;
}

export function deleteBranch(repo: Repo, name: string): boolean {
  if (repo.branches[name] === undefined) return false;
  if (repo.head.type === "branch" && repo.head.branch === name) return false; // не можна видалити поточну
  delete repo.branches[name];
  return true;
}

export function renameBranch(repo: Repo, from: string, to: string): boolean {
  if (repo.branches[from] === undefined || repo.branches[to] !== undefined) return false;
  repo.branches[to] = repo.branches[from];
  delete repo.branches[from];
  if (repo.head.type === "branch" && repo.head.branch === from) repo.head = { type: "branch", branch: to };
  return true;
}

/** Порівнює вміст файла в робочій директорії з індексом (для швидких перевірок). */
export function workdirMatchesIndex(repo: Repo, rel: string): boolean {
  const wd = repo.workdir.files[rel];
  const idx = repo.index[rel];
  if (wd === undefined && !idx) return true;
  if (wd === undefined || !idx) return false;
  return blobOid(wd) === idx.oid;
}

export function lastCommits(repo: Repo, oid: Oid | null, n: number): Commit[] {
  const out: Commit[] = [];
  let cur = oid;
  while (cur && out.length < n) {
    const c = readCommit(repo, cur);
    if (!c) break;
    out.push(c);
    cur = c.parents[0] ?? null;
  }
  return out;
}
