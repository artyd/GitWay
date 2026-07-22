// Команди файлової системи: cd, ls, pwd, mkdir, rm, touch, cat, echo, mv, cp.

import type { CommandResult, Workspace } from "../types";
import { ok, err } from "../types";
import { HOME } from "../types";
import * as P from "../path";
import * as V from "../vfs";
import { parseFlags, parseRedirect, type Redirect } from "../tokenize";

export interface Ctx {
  ws: Workspace;
  clock: () => number;
}

const abs = (ws: Workspace, arg: string) => P.resolve(ws.cwd, arg);

export function pwd(_argv: string[], ctx: Ctx): CommandResult {
  return ok([{ text: ctx.ws.cwd }]);
}

export function cd(argv: string[], ctx: Ctx): CommandResult {
  const { ws } = ctx;
  const target = argv[0];
  let dest: string;
  if (!target || target === "~") dest = HOME;
  else if (target === "-") dest = ws.env.OLDPWD ?? ws.cwd;
  else dest = abs(ws, target);
  if (!V.dirExists(ws, dest)) {
    if (V.fileExists(ws, dest)) return err("cd: not a directory: " + target);
    return err("cd: " + (target ?? "") + ": No such file or directory");
  }
  ws.env.OLDPWD = ws.cwd;
  ws.cwd = dest;
  return ok([]);
}

export function ls(argv: string[], ctx: Ctx): CommandResult {
  const { ws } = ctx;
  const { flags, positional } = parseFlags(argv, { bool: ["-a", "-l", "-la", "-al", "-A"] });
  const showAll = flags["-a"] || flags["-la"] || flags["-al"] || flags["-A"];
  const targets = positional.length ? positional : ["."];
  const out: CommandResult["lines"] = [];
  const multiple = targets.length > 1;
  for (const t of targets) {
    const p = abs(ws, t);
    if (V.fileExists(ws, p)) {
      out.push({ text: t });
      continue;
    }
    if (!V.dirExists(ws, p)) {
      out.push({ text: "ls: cannot access '" + t + "': No such file or directory", tone: "err" });
      continue;
    }
    if (multiple) out.push({ text: t + ":", tone: "meta" });
    const { dirs, files } = V.listDir(ws, p);
    const entries = [...dirs.map((d) => ({ name: d, dir: true })), ...files.map((f) => ({ name: f, dir: false }))];
    if (showAll) {
      out.push({ text: renderLsRow([".", "..", ...entries.map((e) => (e.dir ? e.name + "/" : e.name))]) });
    } else {
      out.push({ text: renderLsRow(entries.map((e) => (e.dir ? e.name + "/" : e.name))) });
    }
    if (multiple) out.push({ text: "" });
  }
  return ok(out);
}

function renderLsRow(names: string[]): string {
  return names.join("   ");
}

export function mkdir(argv: string[], ctx: Ctx): CommandResult {
  const { ws } = ctx;
  const { flags, positional } = parseFlags(argv, { bool: ["-p"] });
  if (!positional.length) return err("mkdir: missing operand");
  for (const t of positional) {
    const p = abs(ws, t);
    if (V.dirExists(ws, p) || V.fileExists(ws, p)) {
      if (!flags["-p"]) return err("mkdir: cannot create directory '" + t + "': File exists");
      continue;
    }
    const parent = P.dirname(p);
    if (!flags["-p"] && !V.dirExists(ws, parent)) {
      return err("mkdir: cannot create directory '" + t + "': No such file or directory");
    }
    V.makeDir(ws, p);
  }
  return ok([]);
}

export function touch(argv: string[], ctx: Ctx): CommandResult {
  const { ws } = ctx;
  if (!argv.length) return err("touch: missing file operand");
  for (const t of argv) {
    const p = abs(ws, t);
    if (V.fileExists(ws, p)) continue;
    const parent = P.dirname(p);
    if (!V.dirExists(ws, parent)) {
      return err("touch: cannot touch '" + t + "': No such file or directory");
    }
    V.writeFile(ws, p, "");
  }
  return ok([]);
}

export function rm(argv: string[], ctx: Ctx): CommandResult {
  const { ws } = ctx;
  const { flags, positional } = parseFlags(argv, { bool: ["-r", "-f", "-rf", "-fr", "-R"] });
  const recursive = flags["-r"] || flags["-rf"] || flags["-fr"] || flags["-R"];
  const force = flags["-f"] || flags["-rf"] || flags["-fr"];
  if (!positional.length) return err("rm: missing operand");
  for (const t of positional) {
    const p = abs(ws, t);
    if (V.fileExists(ws, p)) {
      V.removeFile(ws, p);
    } else if (V.dirExists(ws, p)) {
      if (!recursive) return err("rm: cannot remove '" + t + "': Is a directory");
      V.removeDir(ws, p);
    } else if (!force) {
      return err("rm: cannot remove '" + t + "': No such file or directory");
    }
  }
  return ok([]);
}

export function cat(argv: string[], ctx: Ctx): CommandResult {
  const { ws } = ctx;
  if (!argv.length) return err("cat: missing file operand");
  const out: CommandResult["lines"] = [];
  for (const t of argv) {
    const p = abs(ws, t);
    if (V.dirExists(ws, p) && !V.fileExists(ws, p)) {
      out.push({ text: "cat: " + t + ": Is a directory", tone: "err" });
      continue;
    }
    const content = V.readFile(ws, p);
    if (content === null) {
      out.push({ text: "cat: " + t + ": No such file or directory", tone: "err" });
      continue;
    }
    for (const line of content.split("\n")) out.push({ text: line });
    if (content.endsWith("\n") && out.length && out[out.length - 1].text === "") out.pop();
  }
  return ok(out);
}

export function echo(argv: string[], ctx: Ctx): CommandResult {
  const { ws } = ctx;
  const { argv: rest, redirect } = parseRedirect(argv);
  const expanded = rest.map((a) => expandVars(ws, a));
  const text = expanded.join(" ");
  if (redirect) return applyRedirect(ws, redirect, text + "\n");
  return ok([{ text }]);
}

function expandVars(ws: Workspace, s: string): string {
  return s.replace(/\$(\w+)|\$\{(\w+)\}/g, (_, a, b) => ws.env[a ?? b] ?? "");
}

function applyRedirect(ws: Workspace, redirect: Redirect, text: string): CommandResult {
  const p = abs(ws, redirect.file);
  const parent = P.dirname(p);
  if (!V.dirExists(ws, parent)) {
    return err(ws.cwd + ": " + redirect.file + ": No such file or directory");
  }
  if (redirect.op === ">>") {
    const prev = V.readFile(ws, p) ?? "";
    V.writeFile(ws, p, prev + text);
  } else {
    V.writeFile(ws, p, text);
  }
  return ok([]);
}

export function mv(argv: string[], ctx: Ctx): CommandResult {
  const { ws } = ctx;
  const { positional } = parseFlags(argv, { bool: ["-f"] });
  if (positional.length < 2) return err("mv: missing destination file operand");
  const srcs = positional.slice(0, -1);
  const dst = positional[positional.length - 1];
  const dstAbs = abs(ws, dst);
  const dstIsDir = V.dirExists(ws, dstAbs) && !V.fileExists(ws, dstAbs);
  for (const src of srcs) {
    const sAbs = abs(ws, src);
    const content = V.readFile(ws, sAbs);
    if (content === null) return err("mv: cannot stat '" + src + "': No such file or directory");
    const target = dstIsDir ? P.join(dstAbs, P.basename(sAbs)) : dstAbs;
    V.writeFile(ws, target, content);
    V.removeFile(ws, sAbs);
  }
  return ok([]);
}

export function cp(argv: string[], ctx: Ctx): CommandResult {
  const { ws } = ctx;
  const { positional } = parseFlags(argv, { bool: ["-r", "-R"] });
  if (positional.length < 2) return err("cp: missing destination file operand");
  const srcs = positional.slice(0, -1);
  const dst = positional[positional.length - 1];
  const dstAbs = abs(ws, dst);
  const dstIsDir = V.dirExists(ws, dstAbs) && !V.fileExists(ws, dstAbs);
  for (const src of srcs) {
    const sAbs = abs(ws, src);
    const content = V.readFile(ws, sAbs);
    if (content === null) return err("cp: cannot stat '" + src + "': No such file or directory");
    const target = dstIsDir ? P.join(dstAbs, P.basename(sAbs)) : dstAbs;
    V.writeFile(ws, target, content);
  }
  return ok([]);
}
