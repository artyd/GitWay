// Tab-автодоповнення: команди, підкоманди git, шляхи, назви гілок і remote.

import type { Workspace } from "./types";
import { tokenize } from "./tokenize";
import { currentRepo } from "./workspace";
import * as P from "./path";
import * as V from "./vfs";
import { FS } from "./commands";

const FS_CMDS = Object.keys(FS).concat(["git", "clear", "help", "whoami"]);
const GIT_SUBS = [
  "init", "add", "commit", "status", "log", "diff", "branch", "checkout",
  "switch", "merge", "rebase", "reset", "stash", "remote", "push", "pull", "fetch", "clone", "config",
];
const BRANCH_CONSUMERS = new Set(["checkout", "switch", "merge", "rebase", "branch"]);
const REMOTE_CONSUMERS = new Set(["push", "pull", "fetch"]);

export interface Completion {
  replaceFrom: number; // індекс у рядку, з якого замінюємо
  candidates: string[];
  commonPrefix: string;
}

export function complete(line: string, cursor: number, ws: Workspace): Completion {
  const upto = line.slice(0, cursor);
  const tokens = tokenize(upto);
  const endsWithSpace = /\s$/.test(upto);
  const partial = endsWithSpace ? "" : tokens[tokens.length - 1] ?? "";
  const replaceFrom = cursor - partial.length;

  let candidates: string[] = [];

  const wordIdx = endsWithSpace ? tokens.length : tokens.length - 1;

  if (wordIdx === 0) {
    candidates = FS_CMDS.filter((c) => c.startsWith(partial));
  } else if (tokens[0] === "git") {
    if (wordIdx === 1) {
      candidates = GIT_SUBS.filter((c) => c.startsWith(partial));
    } else {
      const sub = tokens[1];
      const repo = currentRepo(ws);
      if (repo && BRANCH_CONSUMERS.has(sub)) {
        const branches = Object.keys(repo.branches).concat(Object.keys(repo.remoteBranches));
        candidates = branches.filter((b) => b.startsWith(partial));
        // також шляхи (напр. git checkout -- file)
        candidates = candidates.concat(pathCandidates(ws, partial));
      } else if (repo && REMOTE_CONSUMERS.has(sub) && wordIdx === 2) {
        candidates = Object.keys(repo.remotes).filter((rm) => rm.startsWith(partial));
      } else {
        candidates = pathCandidates(ws, partial);
      }
    }
  } else {
    candidates = pathCandidates(ws, partial);
  }

  candidates = Array.from(new Set(candidates)).sort();
  return { replaceFrom, candidates, commonPrefix: longestCommonPrefix(candidates, partial) };
}

function pathCandidates(ws: Workspace, partial: string): string[] {
  const slash = partial.lastIndexOf("/");
  const dirPart = slash < 0 ? "" : partial.slice(0, slash + 1);
  const namePart = slash < 0 ? partial : partial.slice(slash + 1);
  const baseAbs = P.resolve(ws.cwd, dirPart || ".");
  if (!V.dirExists(ws, baseAbs)) return [];
  const { dirs, files } = V.listDir(ws, baseAbs);
  const out: string[] = [];
  for (const d of dirs) if (d.startsWith(namePart)) out.push(dirPart + d + "/");
  for (const f of files) if (f.startsWith(namePart)) out.push(dirPart + f);
  return out;
}

function longestCommonPrefix(items: string[], fallback: string): string {
  if (!items.length) return fallback;
  if (items.length === 1) return items[0];
  let prefix = items[0];
  for (const it of items) {
    let i = 0;
    while (i < prefix.length && i < it.length && prefix[i] === it[i]) i++;
    prefix = prefix.slice(0, i);
  }
  return prefix || fallback;
}
