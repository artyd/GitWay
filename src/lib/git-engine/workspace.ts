// Фабрики та навігація робочого простору: кілька репозиторіїв, cwd, домашня тека.

import { HOME, type Repo, type RepoConfig, type Workspace } from "./types";
import * as P from "./path";

const DEFAULT_CONFIG = (): RepoConfig => ({
  defaultBranch: "main",
  userName: "Учень GitШлях",
  userEmail: "student@gitway.local",
});

export function freshRepo(id: string, name: string, root: string): Repo {
  return {
    id,
    name,
    root,
    objects: {},
    branches: {},
    remoteBranches: {},
    tags: {},
    head: { type: "branch", branch: "main" },
    index: {},
    workdir: { files: {}, dirs: [] },
    stash: [],
    remotes: {},
    pullRequests: [],
    issues: [],
    nextPrNumber: 1,
    nextIssueNumber: 1,
    config: DEFAULT_CONFIG(),
    initialized: false,
  };
}

export function freshWorkspace(account: string): Workspace {
  return {
    version: 1,
    account,
    repos: {},
    currentRepoId: null,
    cwd: HOME,
    env: { HOME, USER: "user" },
    nextRepoSeq: 1,
    looseFiles: {},
    looseDirs: [],
  };
}

export function newRepoId(ws: Workspace): string {
  const id = "repo" + ws.nextRepoSeq;
  ws.nextRepoSeq++;
  return id;
}

/** Репозиторій, у корені якого (або глибше) знаходиться заданий абсолютний шлях. */
export function repoAt(ws: Workspace, absPath: string): Repo | null {
  const norm = P.normalize(absPath);
  let best: Repo | null = null;
  for (const id of Object.keys(ws.repos)) {
    const r = ws.repos[id];
    if (P.isInside(r.root, norm)) {
      if (!best || r.root.length > best.root.length) best = r;
    }
  }
  return best;
}

/** Поточний репозиторій за cwd (або null, якщо ми в домашній теці поза репо). */
export function currentRepo(ws: Workspace): Repo | null {
  return repoAt(ws, ws.cwd);
}

export function repoByName(ws: Workspace, name: string): Repo | null {
  for (const id of Object.keys(ws.repos)) {
    if (ws.repos[id].name === name) return ws.repos[id];
  }
  return null;
}

/** Перетворює абсолютний шлях у шлях відносно кореня репозиторію (posix). */
export function toRepoRel(repo: Repo, absPath: string): string {
  return P.relative(repo.root, P.normalize(absPath));
}

/** Абсолютний шлях із repo-relative. */
export function toAbs(repo: Repo, rel: string): string {
  return P.join(repo.root, rel);
}
