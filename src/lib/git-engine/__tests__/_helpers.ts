import { freshWorkspace } from "../workspace";
import { dispatch } from "../commands";
import { GitEngine } from "../store";
import type { CommandResult, Workspace } from "../types";

/** Детермінований годинник: зростає на 1000мс за виклик. */
export function fixedClock(start = 1_700_000_000_000): () => number {
  let t = start;
  return () => {
    t += 1000;
    return t;
  };
}

export function newWs(account = "test"): Workspace {
  return freshWorkspace(account);
}

/** Проганяє серію команд, повертає останній результат. */
export function run(ws: Workspace, clock: () => number, ...lines: string[]): CommandResult {
  let res: CommandResult = { code: 0, lines: [] };
  for (const l of lines) res = dispatch(ws, l, clock);
  return res;
}

/** Обʼєднаний текст виводу. */
export function text(res: CommandResult): string {
  return res.lines.map((l) => l.text).join("\n");
}

export function makeEngine(account = "test"): { engine: GitEngine; clock: () => number } {
  const clock = fixedClock();
  const engine = new GitEngine(freshWorkspace(account), clock);
  return { engine, clock };
}
