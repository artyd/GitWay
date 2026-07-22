// Клас-стор рушія. Володіє Workspace, мутує його синхронно в exec(),
// збільшує лічильник версій і сповіщає підписників (для useSyncExternalStore).

import type { CommandResult, PullRequest, Repo, StatusReport, Workspace } from "./types";
import { dispatch } from "./commands";
import { computeStatus } from "./status";
import { currentRepo } from "./workspace";
import { saveWorkspace } from "./persistence";

export class GitEngine {
  private ws: Workspace;
  private clock: () => number;
  private listeners = new Set<() => void>();
  version = 0;

  constructor(ws: Workspace, clock: () => number = Date.now) {
    this.ws = ws;
    this.clock = clock;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getVersion = (): number => this.version;

  /** Поточний час рушія (детермінований у тестах). */
  now = (): number => this.clock();

  // ---- читання (використовують обидва UI під час рендеру) ----
  workspace(): Workspace {
    return this.ws;
  }
  repo(): Repo | null {
    return currentRepo(this.ws);
  }
  repoById(id: string): Repo | null {
    return this.ws.repos[id] ?? null;
  }
  allRepos(): Repo[] {
    return Object.values(this.ws.repos);
  }
  status(): StatusReport | null {
    const r = this.repo();
    return r ? computeStatus(r) : null;
  }
  statusOf(repo: Repo): StatusReport {
    return computeStatus(repo);
  }
  cwd(): string {
    return this.ws.cwd;
  }

  // ---- мутація ----
  exec(line: string): CommandResult {
    const res = dispatch(this.ws, line, this.clock);
    this.bump();
    return res;
  }

  /** Пряма мутація робочого простору (для дій GitHub-UI, які не є командами). */
  mutate<T>(fn: (ws: Workspace) => T): T {
    const out = fn(this.ws);
    this.bump();
    return out;
  }

  private bump(): void {
    this.version++;
    saveWorkspace(this.ws);
    this.listeners.forEach((l) => l());
  }
}

export type { PullRequest };
