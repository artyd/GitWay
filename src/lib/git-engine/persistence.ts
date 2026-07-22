// Збереження робочого простору в localStorage. Єдине місце (де)серіалізації.

import type { Repo, Workspace } from "./types";
import { reachable } from "./objects";

const PREFIX = "gitway:sandbox:v1:";

export function storageKey(account: string): string {
  return PREFIX + account;
}

/** Прибирає недосяжні обʼєкти, щоб обмежити розмір у localStorage. */
export function gcRepo(repo: Repo): void {
  const tips = [
    ...Object.values(repo.branches),
    ...Object.values(repo.remoteBranches),
    ...Object.values(repo.tags),
  ];
  if (repo.head.type === "detached") tips.push(repo.head.oid);
  if (repo.mergeHead) tips.push(repo.mergeHead);
  for (const s of repo.stash) tips.push(s.base, s.workTree, s.indexTree);
  // індекс може посилатись на блоби, яких ще немає в комітах
  const keep = reachable(repo, tips);
  for (const e of Object.values(repo.index)) keep.add(e.oid);
  // блоби робочої директорії не зберігаються як обʼєкти, тож нічого не додаємо
  for (const oid of Object.keys(repo.objects)) {
    if (!keep.has(oid)) delete repo.objects[oid];
  }
}

export function serialize(ws: Workspace): string {
  for (const id of Object.keys(ws.repos)) gcRepo(ws.repos[id]);
  return JSON.stringify(ws);
}

export function saveWorkspace(ws: Workspace): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(ws.account), serialize(ws));
  } catch {
    /* квоту перевищено або localStorage недоступний — ігноруємо */
  }
}

export function loadWorkspace(account: string): Workspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(account));
    if (!raw) return null;
    const ws = JSON.parse(raw) as Workspace;
    if (ws.version !== 1) return null;
    return ws;
  } catch {
    return null;
  }
}
