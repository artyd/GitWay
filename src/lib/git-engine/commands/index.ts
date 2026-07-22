// Диспетчер команд: розбирає рядок і маршрутизує до fs- або git-обробника.

import type { CommandResult, Workspace } from "../types";
import { ok, err } from "../types";
import { tokenize } from "../tokenize";
import { cd, ls, pwd, mkdir, rm, touch, cat, echo, mv, cp, type Ctx } from "./fs";
import { GIT } from "./git";

const FS: Record<string, (argv: string[], ctx: Ctx) => CommandResult> = {
  cd,
  ls,
  pwd,
  mkdir,
  rm,
  touch,
  cat,
  echo,
  mv,
  cp,
};

// Прості вбудовані команди
function clearCmd(): CommandResult {
  return { code: 0, lines: [{ text: "\x00CLEAR" }] }; // спецмаркер обробляється терміналом
}

export function dispatch(ws: Workspace, line: string, clock: () => number): CommandResult {
  const trimmed = line.trim();
  if (!trimmed) return ok([]);
  const argv = tokenize(trimmed);
  if (!argv.length) return ok([]);
  const [cmd, ...rest] = argv;
  const ctx: Ctx = { ws, clock };

  if (cmd === "clear") return clearCmd();
  if (cmd === "git") {
    if (!rest.length) return ok(gitUsage());
    const sub = GIT[rest[0]];
    if (!sub) return err("git: '" + rest[0] + "' is not a git command. See 'git --help'.");
    return sub(rest.slice(1), ctx);
  }
  const fs = FS[cmd];
  if (fs) return fs(rest, ctx);

  // help / whoami тощо
  if (cmd === "help") return ok(helpLines());
  if (cmd === "whoami") return ok([{ text: ws.env.USER ?? "user" }]);

  return err(cmd + ": command not found");
}

function gitUsage() {
  return [
    { text: "usage: git <command> [<args>]", tone: "meta" as const },
    { text: "" },
    { text: "Основні команди: init, add, commit, status, log, diff,", tone: "hint" as const },
    { text: "branch, checkout, switch, merge, rebase, stash, remote, push, pull, clone.", tone: "hint" as const },
  ];
}

function helpLines() {
  return [
    { text: "Доступні команди:", tone: "meta" as const },
    { text: "  Файли:  cd ls pwd mkdir rm touch cat echo mv cp clear" },
    { text: "  Git:    git init/add/commit/status/log/diff/branch/checkout/switch/merge/rebase/stash/remote/push/pull/clone" },
  ];
}

export { FS };
