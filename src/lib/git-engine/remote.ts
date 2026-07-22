// Віддалені репозиторії — це інші репо в тому ж робочому просторі.
// Контент-адресація робить «передачу» обʼєднанням досяжних обʼєктів.

import type { CommandResult, Oid, Repo, Workspace } from "./types";
import { ok, err, fatal } from "./types";
import { ancestors, makeBlob, reachable, readCommit } from "./objects";
import { isAncestor, computeMerge } from "./merge";
import { loadTreeIntoWorkdir, commitTree, createCommit } from "./repo";
import { freshRepo, newRepoId } from "./workspace";
import { HOME } from "./types";
import * as P from "./path";

/** Копіює досяжні обʼєкти з src у dest. */
function copyObjects(src: Repo, dest: Repo, tips: Oid[]): void {
  const set = reachable(src, tips);
  for (const oid of set) {
    if (!dest.objects[oid]) dest.objects[oid] = src.objects[oid];
  }
}

export function cloneRepo(ws: Workspace, srcId: string, name?: string): Repo | null {
  const src = ws.repos[srcId];
  if (!src) return null;
  const repoName = name ?? src.name;
  const id = newRepoId(ws);
  const root = P.join(HOME, repoName);
  const dest = freshRepo(id, repoName, root);
  dest.initialized = true;
  dest.config = { ...src.config };

  // Копіюємо всі обʼєкти, досяжні з усіх гілок джерела
  const tips = Object.values(src.branches);
  copyObjects(src, dest, tips);
  dest.branches = { ...src.branches };
  const defBranch = src.config.defaultBranch;
  dest.head = { type: "branch", branch: defBranch in dest.branches ? defBranch : Object.keys(dest.branches)[0] };
  // tracking-гілки
  for (const b of Object.keys(src.branches)) dest.remoteBranches["origin/" + b] = src.branches[b];
  // remote origin -> джерело
  dest.remotes["origin"] = { name: "origin", url: "workspace://" + srcId, targetRepoId: srcId };

  const tip = dest.branches[dest.head.type === "branch" ? dest.head.branch : defBranch];
  loadTreeIntoWorkdir(dest, commitTree(dest, tip ?? null));

  ws.repos[id] = dest;
  return dest;
}

export function pushBranch(
  repo: Repo,
  ws: Workspace,
  remoteName: string,
  branch: string,
  force = false,
): CommandResult {
  const remote = repo.remotes[remoteName];
  if (!remote) return err("fatal: '" + remoteName + "' does not appear to be a git repository");
  const dest = ws.repos[remote.targetRepoId];
  if (!dest) return fatal("fatal: repository '" + remote.url + "' not found");
  const localOid = repo.branches[branch];
  if (localOid === undefined) return err("error: src refspec " + branch + " does not match any");

  const destOid = dest.branches[branch];
  // Fast-forward перевіряємо в ЛОКАЛЬНОМУ репо (у нього є всі обʼєкти):
  // це FF, якщо вершина remote є предком локальної вершини.
  const isFf = destOid !== undefined && repo.objects[destOid] && isAncestor(repo, destOid, localOid);
  if (destOid !== undefined && !force && !isFf) {
    return {
      code: 1,
      lines: [
        { text: "To " + remote.url, tone: "out" },
        { text: " ! [rejected]        " + branch + " -> " + branch + " (non-fast-forward)", tone: "err" },
        {
          text: "error: failed to push some refs to '" + remote.url + "'",
          tone: "err",
        },
        {
          text: "hint: Updates were rejected because the tip of your current branch is behind",
          tone: "hint",
        },
      ],
    };
  }

  copyObjects(repo, dest, [localOid]);
  dest.branches[branch] = localOid;
  repo.remoteBranches[remoteName + "/" + branch] = localOid;

  const range = destOid ? destOid.slice(0, 7) + ".." + localOid.slice(0, 7) : "* [new branch]";
  return ok([
    { text: "To " + remote.url, tone: "out" },
    { text: "   " + range + "  " + branch + " -> " + branch, tone: "out" },
  ]);
}

export function fetchRemote(repo: Repo, ws: Workspace, remoteName: string): CommandResult {
  const remote = repo.remotes[remoteName];
  if (!remote) return err("fatal: '" + remoteName + "' does not appear to be a git repository");
  const src = ws.repos[remote.targetRepoId];
  if (!src) return fatal("fatal: repository '" + remote.url + "' not found");
  const tips = Object.values(src.branches);
  copyObjects(src, repo, tips);
  const updated: string[] = [];
  for (const b of Object.keys(src.branches)) {
    const key = remoteName + "/" + b;
    if (repo.remoteBranches[key] !== src.branches[b]) {
      repo.remoteBranches[key] = src.branches[b];
      updated.push(b);
    }
  }
  if (!updated.length) return ok([]);
  return ok([
    { text: "From " + remote.url, tone: "out" },
    ...updated.map((b) => ({ text: "   " + b + " -> " + remoteName + "/" + b, tone: "out" as const })),
  ]);
}

export function pullRemote(
  repo: Repo,
  ws: Workspace,
  remoteName: string,
  branch: string,
  clock: () => number,
): CommandResult {
  const fetchRes = fetchRemote(repo, ws, remoteName);
  if (fetchRes.code !== 0) return fetchRes;
  const upstream = remoteName + "/" + branch;
  const theirs = repo.remoteBranches[upstream];
  if (theirs === undefined) return err("fatal: couldn't find remote ref " + branch);
  if (repo.head.type !== "branch") return err("fatal: not currently on any branch.");
  const cur = repo.head.branch;
  const ours = repo.branches[cur];

  if (ours === undefined) {
    // локальної гілки ще немає — просто ставимо
    repo.branches[cur] = theirs;
    loadTreeIntoWorkdir(repo, commitTree(repo, theirs));
    return ok([...fetchRes.lines, { text: "Fast-forward", tone: "out" }]);
  }

  const merge = computeMerge(repo, ours, theirs, upstream);
  if (merge.kind === "upToDate") return ok([{ text: "Already up to date.", tone: "out" }]);
  if (merge.kind === "ff") {
    repo.branches[cur] = theirs;
    loadTreeIntoWorkdir(repo, commitTree(repo, theirs));
    return ok([
      ...fetchRes.lines,
      { text: "Updating " + short(ours) + ".." + short(theirs), tone: "out" },
      { text: "Fast-forward", tone: "out" },
    ]);
  }
  // застосовуємо злиття у робочу директорію
  applyMergeToWorkdir(repo, merge.mergedFiles);
  if (merge.kind === "conflict") {
    repo.mergeHead = theirs;
    repo.mergeMessage = "Merge branch '" + branch + "' of " + remoteName;
    return {
      code: 1,
      lines: [
        ...merge.conflicts.map((p) => ({ text: "CONFLICT (content): Merge conflict in " + p, tone: "err" as const })),
        { text: "Automatic merge failed; fix conflicts and then commit the result.", tone: "err" },
      ],
    };
  }
  // clean -> merge-коміт
  for (const p of Object.keys(merge.mergedFiles)) {
    repo.index[p] = { path: p, oid: hashInto(repo, merge.mergedFiles[p]), mode: "100644" };
  }
  repo.mergeHead = theirs;
  const oid = createCommit(repo, "Merge branch '" + branch + "' of " + remoteName, clock);
  return ok([{ text: "Merge made by the 'recursive' strategy.", tone: "out" }, { text: short(ours) + ".." + short(oid), tone: "out" }]);
}

// допоміжне
function short(o: Oid): string {
  return o.slice(0, 7);
}
function applyMergeToWorkdir(repo: Repo, files: Record<string, string>): void {
  repo.workdir.files = { ...files };
}
function hashInto(repo: Repo, content: string): Oid {
  return makeBlob(repo, content);
}

export { ancestors, readCommit };
