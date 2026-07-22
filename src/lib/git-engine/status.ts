// Єдиний оракул стану. І термінал (git status), і GitHub-UI (панель staging)
// викликають computeStatus — тому вони не можуть розійтися.

import type { Oid, Repo, StatusReport } from "./types";
import { blobOid, headCommit, headCommitOid, treeToMap, ancestors } from "./objects";

const CONFLICT_MARK = "<<<<<<<";

/** Чи містить файл маркери конфлікту злиття. */
export function hasConflictMarkers(content: string): boolean {
  return content.includes(CONFLICT_MARK);
}

export function computeStatus(repo: Repo): StatusReport {
  const head = headCommit(repo);
  const headMap = treeToMap(repo, head ? head.tree : null);
  const index = repo.index;
  const workdir = repo.workdir.files;

  const staged: StatusReport["staged"] = [];
  const unstaged: StatusReport["unstaged"] = [];
  const untracked: string[] = [];
  const conflicts: string[] = [];

  const merging = !!repo.mergeHead;

  // staged = різниця HEAD-дерево <-> індекс
  const indexPaths = Object.keys(index);
  for (const p of indexPaths) {
    const inHead = headMap[p];
    if (!inHead) staged.push({ path: p, kind: "new" });
    else if (inHead !== index[p].oid) staged.push({ path: p, kind: "modified" });
  }
  for (const p of Object.keys(headMap)) {
    if (!index[p]) staged.push({ path: p, kind: "deleted" });
  }

  // unstaged = різниця індекс <-> робоча директорія
  for (const p of indexPaths) {
    const wd = workdir[p];
    if (wd === undefined) {
      unstaged.push({ path: p, kind: "deleted" });
    } else {
      if (merging && hasConflictMarkers(wd)) {
        conflicts.push(p);
        continue;
      }
      if (blobOid(wd) !== index[p].oid) unstaged.push({ path: p, kind: "modified" });
    }
  }

  // untracked = у робочій директорії, але не в індексі
  for (const p of Object.keys(workdir)) {
    if (!index[p]) untracked.push(p);
  }

  staged.sort(byPath);
  unstaged.sort(byPath);
  untracked.sort();
  conflicts.sort();

  // ahead/behind відносно upstream (origin/<branch>)
  let ahead = 0;
  let behind = 0;
  let upstream: string | null = null;
  const branch = repo.head.type === "branch" ? repo.head.branch : null;
  if (branch) {
    const up = "origin/" + branch;
    if (repo.remoteBranches[up] !== undefined) {
      upstream = up;
      const localOid = repo.branches[branch] ?? null;
      const upOid = repo.remoteBranches[up];
      ahead = countAheadBehind(repo, localOid, upOid);
      behind = countAheadBehind(repo, upOid, localOid);
    }
  }

  return {
    branch,
    detached: repo.head.type === "detached",
    head: headCommitOid(repo),
    ahead,
    behind,
    upstream,
    staged,
    unstaged,
    untracked,
    conflicts,
    merging,
  };
}

function byPath(a: { path: string }, b: { path: string }) {
  return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}

/** Скільки комітів досяжні з `from`, але не з `other` (ahead). */
function countAheadBehind(repo: Repo, from: Oid | null, other: Oid | null): number {
  if (!from) return 0;
  const otherAnc = other ? ancestors(repo, other) : new Set<Oid>();
  const fromAnc = ancestors(repo, from);
  let n = 0;
  for (const oid of fromAnc) if (!otherAnc.has(oid)) n++;
  return n;
}

/** Чи є незбережені зміни (для попереджень checkout/merge). */
export function isDirty(repo: Repo): boolean {
  const st = computeStatus(repo);
  return st.staged.length > 0 || st.unstaged.length > 0 || st.conflicts.length > 0;
}
