// Емуляція git CLI поверх спільної моделі. Усі підкоманди діють на поточний репо.

import type { CommandResult, Oid, Repo, Workspace } from "../types";
import { ok, err, fatal } from "../types";
import { short } from "../oid";
import * as P from "../path";
import { currentRepo, freshRepo, newRepoId, repoByName, toRepoRel } from "../workspace";
import {
  ancestors,
  buildTreeFromIndex,
  headCommit,
  headCommitOid,
  commitHistory,
  makeBlob,
  makeCommit,
  readCommit,
  recordReflog,
  resolveRef,
  treeToFileMap,
  treeToMap,
} from "../objects";
import {
  checkoutBranch,
  checkoutCommit,
  commitTree,
  createBranch,
  createCommit,
  deleteBranch,
  loadTreeIntoWorkdir,
  renameBranch,
  signature,
  stageFile,
  stagePathspec,
  unstagePath,
} from "../repo";
import { computeStatus } from "../status";
import { treeDiff, unifiedDiff } from "../diff";
import { computeMerge, isAncestor, mergeBase } from "../merge";
import { cloneRepo, fetchRemote, pullRemote, pushBranch } from "../remote";
import { formatLog, formatStatus, firstLine, graphify } from "./format";
import { parseFlags } from "../tokenize";
import type { Ctx } from "./fs";

function requireRepo(ws: Workspace): Repo | CommandResult {
  const repo = currentRepo(ws);
  if (!repo || !repo.initialized) {
    return fatal("fatal: not a git repository (or any of the parent directories): .git");
  }
  return repo;
}
const isResult = (x: Repo | CommandResult): x is CommandResult => "code" in x;

// ---------- init ----------
export function init(argv: string[], ctx: Ctx): CommandResult {
  const { ws } = ctx;
  const { positional } = parseFlags(argv);
  const existing = currentRepo(ws);
  if (existing && existing.initialized && !positional.length) {
    return ok([{ text: "Reinitialized existing Git repository in " + existing.root + "/.git/" }]);
  }
  let root = ws.cwd;
  let name = P.basename(ws.cwd) || "user";
  if (positional.length) {
    name = positional[0];
    root = P.join(ws.cwd, name);
  }
  // якщо в цьому каталозі вже є репо
  const at = repoByName(ws, name);
  if (at && at.root === root) return ok([{ text: "Reinitialized existing Git repository in " + root + "/.git/" }]);

  const id = newRepoId(ws);
  const repo = freshRepo(id, name, root);
  repo.initialized = true;
  // переносимо loose-файли/каталоги під цим коренем у робочу директорію
  const prefix = root === "/" ? "/" : root + "/";
  for (const f of Object.keys(ws.looseFiles)) {
    if (f === root || f.startsWith(prefix)) {
      repo.workdir.files[P.relative(root, f)] = ws.looseFiles[f];
      delete ws.looseFiles[f];
    }
  }
  ws.looseDirs = ws.looseDirs.filter((d) => {
    if (d.startsWith(prefix)) {
      repo.workdir.dirs.push(P.relative(root, d));
      return false;
    }
    return true;
  });
  ws.repos[id] = repo;
  ws.currentRepoId = id;
  return ok([{ text: "Initialized empty Git repository in " + root + "/.git/" }]);
}

// ---------- add ----------
export function add(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, positional } = parseFlags(argv, { bool: ["-A", "--all", "-a"] });
  const specs = flags["-A"] || flags["--all"] ? ["."] : positional;
  if (!specs.length) return err('Nothing specified, nothing added.');
  for (const spec of specs) {
    let rel: string;
    if (spec === "." || spec === "-A") rel = ".";
    else rel = toRepoRel(r, P.resolve(ctx.ws.cwd, spec));
    const n = stagePathspec(r, rel);
    if (n === 0 && rel !== "." && r.workdir.files[rel] === undefined && !hasChildren(r, rel)) {
      return err("fatal: pathspec '" + spec + "' did not match any files");
    }
  }
  return ok([]);
}
function hasChildren(repo: Repo, rel: string): boolean {
  const pre = rel + "/";
  return Object.keys(repo.workdir.files).some((f) => f.startsWith(pre));
}

// ---------- commit ----------
export function commit(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, values } = parseFlags(argv, {
    bool: ["-a", "--all", "-am", "-ma", "--amend"],
    value: ["-m", "--message"],
  });
  let message = values["-m"] ?? values["--message"] ?? "";
  // підтримка -am "msg": -a + -m
  const stageAll = flags["-a"] || flags["--all"] || flags["-am"] || flags["-ma"];
  if ((flags["-am"] || flags["-ma"]) && !message) {
    // повідомлення — перший позиційний після -am
    const idx = argv.findIndex((a) => a === "-am" || a === "-ma");
    message = argv[idx + 1] ?? "";
  }
  if (stageAll) {
    for (const p of Object.keys(r.workdir.files)) if (r.index[p]) stageFile(r, p);
    for (const p of Object.keys(r.index)) if (r.workdir.files[p] === undefined) delete r.index[p];
  }

  // --amend: переписати ОСТАННІЙ коміт (нове дерево з індексу + нове/старе повідомлення),
  // зберігаючи його батьків і початкового автора.
  if (flags["--amend"]) {
    const prevOid = headCommitOid(r);
    const prev = prevOid ? readCommit(r, prevOid) : null;
    if (!prev) return err("fatal: You have nothing to amend.");
    const st0 = computeStatus(r);
    if (st0.conflicts.length) return err("error: Committing is not possible because you have unmerged files.");
    const msg = message || prev.message;
    const tree = buildTreeFromIndex(r, r.index);
    const sig = signature(r, ctx.clock);
    const oid = makeCommit(r, tree, prev.parents, prev.author, sig, msg);
    if (r.head.type === "branch") r.branches[r.head.branch] = oid;
    else r.head = { type: "detached", oid };
    recordReflog(r, oid, "commit (amend): " + firstLine(msg), sig.when);
    const branch0 = r.head.type === "branch" ? r.head.branch : "HEAD detached";
    return ok([
      { text: `[${branch0} ${short(oid)}] ${firstLine(msg)}`, tone: "out" },
      { text: ` ${st0.staged.length} file${st0.staged.length === 1 ? "" : "s"} changed${summarize(r, oid)}`, tone: "out" },
    ]);
  }

  if (!message) return err('Aborting commit due to empty commit message. Use: git commit -m "..."');

  const st = computeStatus(r);
  if (st.conflicts.length) return err("error: Committing is not possible because you have unmerged files.");
  const isMerge = !!r.mergeHead;
  if (!st.staged.length && !isMerge) {
    return ok([
      { text: "On branch " + (st.branch ?? "?"), tone: "meta" },
      { text: "nothing to commit, working tree clean", tone: "meta" },
    ]);
  }
  const wasRoot = !headCommitOid(r);
  const branch = r.head.type === "branch" ? r.head.branch : "HEAD detached";
  const changes = st.staged.length;
  const oid = createCommit(r, message, ctx.clock);
  const rootTag = wasRoot ? " (root-commit)" : "";
  const summary = summarize(r, oid);
  return ok([
    { text: `[${branch}${rootTag} ${short(oid)}] ${firstLine(message)}`, tone: "out" },
    { text: ` ${changes} file${changes === 1 ? "" : "s"} changed${summary}`, tone: "out" },
  ]);
}

function summarize(repo: Repo, oid: Oid): string {
  const c = readCommit(repo, oid);
  if (!c) return "";
  const parentTree = c.parents[0] ? commitTree(repo, c.parents[0]) : null;
  const changes = treeDiff(repo, parentTree, c.tree);
  let add = 0;
  let del = 0;
  for (const ch of changes) {
    add += ch.additions;
    del += ch.deletions;
  }
  const parts: string[] = [];
  if (add) parts.push(add + " insertion" + (add === 1 ? "" : "s") + "(+)");
  if (del) parts.push(del + " deletion" + (del === 1 ? "" : "s") + "(-)");
  return parts.length ? ", " + parts.join(", ") : "";
}

// ---------- status ----------
export function status(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags } = parseFlags(argv, { bool: ["-s", "--short"] });
  const st = computeStatus(r);
  if (flags["-s"] || flags["--short"]) {
    const out: CommandResult["lines"] = [];
    for (const s of st.staged) out.push({ text: codeFor(s.kind, true) + "  " + s.path, tone: "add" });
    for (const s of st.unstaged) out.push({ text: " " + codeFor(s.kind, false) + " " + s.path, tone: "del" });
    for (const p of st.conflicts) out.push({ text: "UU " + p, tone: "err" });
    for (const p of st.untracked) out.push({ text: "?? " + p, tone: "err" });
    return ok(out);
  }
  return ok(formatStatus(r, st));
}
function codeFor(kind: string, staged: boolean): string {
  if (kind === "new") return staged ? "A" : "?";
  if (kind === "deleted") return "D";
  return "M";
}

// ---------- log ----------
export function log(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, values, positional } = parseFlags(argv, {
    bool: ["--oneline", "--graph", "--all"],
    value: ["-n", "--max-count"],
  });
  const head = headCommitOid(r);
  if (!head) return err("fatal: your current branch does not have any commits yet");
  let commits = positional.length ? commitHistory(r, resolveRef(r, positional[0])) : commitHistory(r, head);
  const n = parseInt(values["-n"] ?? values["--max-count"] ?? "", 10);
  if (!isNaN(n)) commits = commits.slice(0, n);
  const oneline = !!flags["--oneline"];
  const lines = formatLog(r, commits, oneline);
  return ok(flags["--graph"] ? graphify(lines, oneline) : lines);
}

// ---------- diff ----------
export function diff(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, positional } = parseFlags(argv, { bool: ["--staged", "--cached", "--stat"] });
  const out: CommandResult["lines"] = [];

  if (positional.length === 2) {
    const a = resolveRef(r, positional[0]);
    const b = resolveRef(r, positional[1]);
    if (!a || !b) return err("fatal: ambiguous argument");
    for (const ch of treeDiff(r, commitTree(r, a), commitTree(r, b))) {
      out.push(...unifiedDiff(ch.path, ch.oldText, ch.newText));
    }
    return ok(out);
  }

  const head = headCommit(r);
  const headMap = treeToFileMap(r, head ? head.tree : null);

  if (flags["--staged"] || flags["--cached"]) {
    // index vs HEAD
    const idxFiles: Record<string, string> = {};
    for (const p of Object.keys(r.index)) {
      const b = r.objects[r.index[p].oid];
      idxFiles[p] = b && b.type === "blob" ? b.content : "";
    }
    diffMaps(headMap, idxFiles, out);
    return ok(out);
  }
  // workdir vs index
  const idxFiles: Record<string, string> = {};
  for (const p of Object.keys(r.index)) {
    const b = r.objects[r.index[p].oid];
    idxFiles[p] = b && b.type === "blob" ? b.content : "";
  }
  diffMaps(idxFiles, r.workdir.files, out, r.index);
  return ok(out);
}

function diffMaps(
  oldF: Record<string, string>,
  newF: Record<string, string>,
  out: CommandResult["lines"],
  onlyTracked?: Record<string, unknown>,
) {
  const paths = Array.from(new Set([...Object.keys(oldF), ...Object.keys(newF)])).sort();
  for (const p of paths) {
    if (onlyTracked && !(p in onlyTracked) && !(p in oldF)) continue; // не показуємо untracked у git diff
    const o = oldF[p] ?? null;
    const n = newF[p] ?? null;
    if (o === n) continue;
    out.push(...unifiedDiff(p, o, n));
  }
}

// ---------- branch ----------
export function branch(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, values, positional } = parseFlags(argv, {
    bool: ["-a", "--all", "-v"],
    value: ["-d", "-D", "--delete", "-m", "-M"],
  });
  const del = values["-d"] ?? values["-D"] ?? values["--delete"];
  if (del !== undefined) {
    const name = del || positional[0];
    if (!deleteBranch(r, name)) {
      if (r.head.type === "branch" && r.head.branch === name)
        return err("error: Cannot delete branch '" + name + "' checked out at '" + r.root + "'");
      return err("error: branch '" + name + "' not found.");
    }
    return ok([{ text: "Deleted branch " + name + " (was " + short(resolveRef(r, name) ?? "") + ")." }]);
  }
  const ren = values["-m"] ?? values["-M"];
  if (ren !== undefined) {
    // git branch -m <new>            -> перейменувати поточну
    // git branch -m <old> <new>      -> перейменувати задану
    const oldName = positional.length >= 1 ? ren : currentBranchName(r);
    const newName = positional.length >= 1 ? positional[0] : ren;
    if (!oldName || !newName) return err("error: branch rename requires a name");
    if (!renameBranch(r, oldName, newName)) {
      if (r.branches[oldName] === undefined) return err("error: refname refs/heads/" + oldName + " not found");
      return err("fatal: a branch named '" + newName + "' already exists");
    }
    return ok([]);
  }
  if (positional.length) {
    if (!createBranch(r, positional[0], positional[1] ? resolveRef(r, positional[1]) ?? undefined : undefined)) {
      if (r.branches[positional[0]] !== undefined)
        return err("fatal: a branch named '" + positional[0] + "' already exists");
      return err("fatal: not a valid object name: 'HEAD'");
    }
    return ok([]);
  }
  // список
  const out: CommandResult["lines"] = [];
  const cur = currentBranchName(r);
  const names = Object.keys(r.branches).sort();
  for (const b of names) {
    const marker = b === cur ? "* " : "  ";
    const line = flags["-v"] ? `${marker}${b} ${short(r.branches[b])} ${firstLine(readCommit(r, r.branches[b])?.message ?? "")}` : marker + b;
    out.push({ text: line, tone: b === cur ? "branch" : "out" });
  }
  if (flags["-a"] || flags["--all"]) {
    for (const rb of Object.keys(r.remoteBranches).sort()) {
      out.push({ text: "  remotes/" + rb, tone: "meta" });
    }
  }
  return ok(out);
}
function currentBranchName(r: Repo): string {
  return r.head.type === "branch" ? r.head.branch : "";
}

// ---------- checkout / switch ----------
export function checkout(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, values, positional } = parseFlags(argv, { bool: ["-b", "-B"], value: [] });
  void values;
  // git checkout -- <file> : відновити файл
  if (positional[0] === "--" || flags["--"]) {
    const files = positional.filter((p) => p !== "--");
    return restoreFiles(r, ctx.ws, files);
  }
  if (flags["-b"] || flags["-B"]) {
    const name = positional[0];
    if (!name) return err("fatal: missing branch name");
    if (r.branches[name] !== undefined && !flags["-B"]) return err("fatal: a branch named '" + name + "' already exists");
    createBranch(r, name);
    checkoutBranch(r, name);
    return ok([{ text: "Switched to a new branch '" + name + "'", tone: "meta" }]);
  }
  const target = positional[0];
  if (!target) return err("error: pathspec required");
  if (r.branches[target] !== undefined) {
    checkoutBranch(r, target);
    return ok([{ text: "Switched to branch '" + target + "'", tone: "meta" }]);
  }
  // віддалена гілка -> створюємо локальну
  if (r.remoteBranches[target] !== undefined) {
    const localName = target.split("/").slice(1).join("/");
    createBranch(r, localName, r.remoteBranches[target]);
    checkoutBranch(r, localName);
    return ok([{ text: "Switched to a new branch '" + localName + "'", tone: "meta" }]);
  }
  const oid = resolveRef(r, target);
  if (oid) {
    checkoutCommit(r, oid);
    return ok([
      { text: "Note: switching to '" + target + "'.", tone: "meta" },
      { text: "You are in 'detached HEAD' state.", tone: "warn" },
      { text: "HEAD is now at " + short(oid) + " " + firstLine(readCommit(r, oid)?.message ?? ""), tone: "meta" },
    ]);
  }
  // можливо, це файл для відновлення
  if (r.workdir.files[toRepoRel(r, P.resolve(ctx.ws.cwd, target))] !== undefined) {
    return restoreFiles(r, ctx.ws, [target]);
  }
  return err("error: pathspec '" + target + "' did not match any file(s) known to git");
}

export function switchCmd(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, positional } = parseFlags(argv, { bool: ["-c", "-C"] });
  const name = positional[0];
  if (!name) return err("fatal: missing branch or commit argument");
  if (flags["-c"] || flags["-C"]) {
    if (r.branches[name] !== undefined) return err("fatal: a branch named '" + name + "' already exists");
    createBranch(r, name);
    checkoutBranch(r, name);
    return ok([{ text: "Switched to a new branch '" + name + "'", tone: "meta" }]);
  }
  if (r.branches[name] === undefined) {
    if (r.remoteBranches["origin/" + name] !== undefined) {
      createBranch(r, name, r.remoteBranches["origin/" + name]);
      checkoutBranch(r, name);
      return ok([{ text: "Switched to a new branch '" + name + "'", tone: "meta" }]);
    }
    return err("fatal: invalid reference: " + name);
  }
  checkoutBranch(r, name);
  return ok([{ text: "Switched to branch '" + name + "'", tone: "meta" }]);
}

function restoreFiles(r: Repo, ws: Workspace, files: string[]): CommandResult {
  const head = headCommit(r);
  const headMap = treeToFileMap(r, head ? head.tree : null);
  for (const f of files) {
    const rel = toRepoRel(r, P.resolve(ws.cwd, f));
    const idx = r.index[rel];
    if (idx) {
      const b = r.objects[idx.oid];
      r.workdir.files[rel] = b && b.type === "blob" ? b.content : "";
    } else if (headMap[rel] !== undefined) {
      r.workdir.files[rel] = headMap[rel];
    }
  }
  return ok([]);
}

// ---------- merge ----------
export function merge(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, positional } = parseFlags(argv, { bool: ["--no-ff", "--abort"] });
  if (flags["--abort"]) {
    if (!r.mergeHead) return err("fatal: There is no merge to abort (MERGE_HEAD missing).");
    loadTreeIntoWorkdir(r, commitTree(r, headCommitOid(r)));
    r.mergeHead = undefined;
    r.mergeMessage = undefined;
    return ok([]);
  }
  const target = positional[0];
  if (!target) return err("fatal: No commit specified and merge.defaultToUpstream not set.");
  const theirs = resolveRef(r, target);
  if (!theirs) return err("merge: " + target + " - not something we can merge");
  const ours = headCommitOid(r);
  if (!ours) return err("fatal: no current commit to merge into");
  if (r.head.type !== "branch") return err("fatal: not on a branch");

  const res = computeMerge(r, ours, theirs, target);
  if (res.kind === "upToDate") return ok([{ text: "Already up to date." }]);

  if (res.kind === "ff" && !flags["--no-ff"]) {
    r.branches[r.head.branch] = theirs;
    loadTreeIntoWorkdir(r, commitTree(r, theirs));
    recordReflog(r, theirs, `merge ${target}: Fast-forward`);
    return ok([
      { text: "Updating " + short(ours) + ".." + short(theirs) },
      { text: "Fast-forward" },
    ]);
  }

  // застосовуємо файли злиття в робочу директорію
  r.workdir.files = { ...res.mergedFiles };

  if (res.kind === "conflict") {
    r.mergeHead = theirs;
    r.mergeMessage = "Merge branch '" + target + "'";
    // стейджимо неконфліктні, конфліктні лишаємо
    for (const p of Object.keys(res.mergedFiles)) {
      if (!res.conflicts.includes(p)) stageFile(r, p);
    }
    const lines: CommandResult["lines"] = res.conflicts.map((p) => ({
      text: "CONFLICT (content): Merge conflict in " + p,
      tone: "err" as const,
    }));
    lines.push({ text: "Automatic merge failed; fix conflicts and then commit the result.", tone: "err" });
    return { code: 1, lines };
  }

  // clean -> merge-коміт
  for (const p of Object.keys(res.mergedFiles)) stageFile(r, p);
  for (const p of Object.keys(r.index)) if (res.mergedFiles[p] === undefined) delete r.index[p];
  r.mergeHead = theirs;
  const oid = createCommit(r, "Merge branch '" + target + "'", ctx.clock);
  return ok([
    { text: "Merge made by the 'recursive' strategy." },
    { text: " " + short(ours) + ".." + short(oid) },
  ]);
}

// ---------- rebase (базовий, лінійний) ----------
export function rebase(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, positional } = parseFlags(argv, { bool: ["--abort", "--continue"] });
  if (flags["--abort"] || flags["--continue"]) return ok([]);
  const target = positional[0];
  if (!target) return err("fatal: no rebase target");
  const onto = resolveRef(r, target);
  if (!onto) return err("fatal: invalid upstream '" + target + "'");
  if (r.head.type !== "branch") return err("fatal: not on a branch");
  const branchName = r.head.branch;
  const ours = r.branches[branchName];

  if (isAncestor(r, ours, onto)) {
    r.branches[branchName] = onto;
    loadTreeIntoWorkdir(r, commitTree(r, onto));
    return ok([{ text: "Fast-forwarded " + branchName + " to " + target + "." }]);
  }
  const base = mergeBase(r, ours, onto);
  if (base === onto) return ok([{ text: "Current branch " + branchName + " is up to date." }]);

  // коміти нашої гілки після бази (у хронологічному порядку) переносимо на onto
  const ourCommits = commitsBetween(r, base, ours);
  let cursor = onto;
  for (const c of ourCommits) {
    const parentTree = c.parents[0] ? commitTree(r, c.parents[0]) : null;
    const changes = treeDiff(r, parentTree, c.tree);
    const files = { ...treeToFileMap(r, commitTree(r, cursor)) };
    for (const ch of changes) {
      if (ch.status === "deleted") delete files[ch.path];
      else files[ch.path] = ch.newText ?? "";
    }
    r.workdir.files = { ...files };
    r.index = {};
    for (const p of Object.keys(files)) stageFile(r, p);
    r.head = { type: "detached", oid: cursor };
    cursor = createCommit(r, c.message, ctx.clock);
  }
  // повертаємо гілку на нову вершину
  r.branches[branchName] = cursor;
  r.head = { type: "branch", branch: branchName };
  loadTreeIntoWorkdir(r, commitTree(r, cursor));
  return ok([
    { text: "Successfully rebased and updated refs/heads/" + branchName + " (onto " + target + ")." },
  ]);
}
function commitsBetween(r: Repo, base: Oid | null, tip: Oid) {
  const baseAnc = base ? ancestors(r, base) : new Set<Oid>();
  const chain = [];
  let cur: Oid | null = tip;
  while (cur && !baseAnc.has(cur)) {
    const c = readCommit(r, cur);
    if (!c) break;
    chain.push(c);
    cur = c.parents[0] ?? null;
  }
  return chain.reverse();
}

// ---------- reset ----------
export function reset(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, positional } = parseFlags(argv, { bool: ["--hard", "--soft", "--mixed"] });
  if (!flags["--hard"] && !flags["--soft"] && !flags["--mixed"] && positional.length) {
    // git reset <path> -> unstage
    for (const spec of positional) {
      const rel = toRepoRel(r, P.resolve(ctx.ws.cwd, spec));
      unstagePath(r, rel);
    }
    return ok([]);
  }
  const target = positional[0] ?? "HEAD";
  const oid = resolveRef(r, target);
  if (!oid) return err("fatal: ambiguous argument '" + target + "'");
  if (r.head.type === "branch") r.branches[r.head.branch] = oid;
  else r.head = { type: "detached", oid };
  const mode = flags["--hard"] ? "hard" : flags["--soft"] ? "soft" : "mixed";
  recordReflog(r, oid, `reset: moving to ${target}` + (mode === "hard" ? " (hard)" : ""));
  if (flags["--hard"]) {
    loadTreeIntoWorkdir(r, commitTree(r, oid));
  } else {
    // mixed (default): скидаємо індекс до дерева, робочу лишаємо
    const files = treeToFileMap(r, commitTree(r, oid));
    r.index = {};
    for (const p of Object.keys(files)) {
      const b = makeBlob(r, files[p]);
      r.index[p] = { path: p, oid: b, mode: "100644" };
    }
  }
  return ok([{ text: "HEAD is now at " + short(oid) + " " + firstLine(readCommit(r, oid)?.message ?? "") }]);
}

// ---------- stash ----------
/** Парсить "stash@{n}" -> n (default 0). */
function parseStashIndex(ref: string | undefined): number {
  if (!ref) return 0;
  const m = ref.match(/stash@\{(\d+)\}/);
  if (m) return parseInt(m[1], 10);
  const n = parseInt(ref, 10);
  return isNaN(n) ? 0 : n;
}
export function stash(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  let sub = argv[0] ?? "push";
  // "git stash" без аргументів == "git stash push"; "git stash save <msg>" — старий синонім.
  if (sub.startsWith("-")) sub = "push";

  if (sub === "list") {
    if (!r.stash.length) return ok([]);
    return ok(r.stash.map((s, i) => ({ text: `stash@{${i}}: ${s.message}` })));
  }
  if (sub === "clear") {
    r.stash = [];
    return ok([]);
  }
  if (sub === "drop") {
    if (!r.stash.length) return err("No stash entries found.");
    const idx = parseStashIndex(argv[1]);
    if (idx < 0 || idx >= r.stash.length) return err("fatal: log for 'stash' only has " + r.stash.length + " entries");
    const removed = r.stash.splice(idx, 1)[0];
    return ok([{ text: `Dropped stash@{${idx}} (${removed.message})` }]);
  }
  if (sub === "pop" || sub === "apply") {
    if (!r.stash.length) return err("No stash entries found.");
    const idx = parseStashIndex(argv[1]);
    if (idx < 0 || idx >= r.stash.length) return err("fatal: log for 'stash' only has " + r.stash.length + " entries");
    const entry = r.stash[idx];
    // відновлюємо і робочу директорію, і індекс (staged-стан)
    r.workdir.files = { ...treeToFileMap(r, entry.workTree) };
    const idxMap = treeToMap(r, entry.indexTree);
    r.index = {};
    for (const p of Object.keys(idxMap)) r.index[p] = { path: p, oid: idxMap[p], mode: "100644" };
    if (sub === "pop") r.stash.splice(idx, 1);
    const out = formatStatus(r, computeStatus(r));
    return ok([...out, { text: (sub === "pop" ? `Dropped stash@{${idx}}` : "Applied stash@{" + idx + "}"), tone: "meta" }]);
  }
  // push (default)
  const st = computeStatus(r);
  if (!st.staged.length && !st.unstaged.length && !st.untracked.length) {
    return ok([{ text: "No local changes to save" }]);
  }
  const workTree = buildTreeFromIndex(r, snapshotWorkdirIndex(r));
  const indexTree = buildTreeFromIndex(r, r.index);
  const base = headCommitOid(r) ?? "";
  r.stash.unshift({
    message: "WIP on " + (r.head.type === "branch" ? r.head.branch : "HEAD") + ": " + short(base),
    when: ctx.clock(),
    base,
    workTree,
    indexTree,
  });
  // очищаємо робочу директорію до HEAD
  loadTreeIntoWorkdir(r, commitTree(r, headCommitOid(r)));
  return ok([{ text: "Saved working directory and index state WIP" }]);
}
function snapshotWorkdirIndex(r: Repo) {
  const idx: Record<string, { path: string; oid: Oid; mode: "100644" }> = {};
  for (const p of Object.keys(r.workdir.files)) {
    idx[p] = { path: p, oid: makeBlob(r, r.workdir.files[p]), mode: "100644" };
  }
  return idx;
}

// ---------- remote ----------
export function remote(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, positional } = parseFlags(argv, { bool: ["-v"] });
  const sub = positional[0];
  if (!sub) {
    const out: CommandResult["lines"] = [];
    for (const name of Object.keys(r.remotes)) {
      if (flags["-v"]) {
        out.push({ text: name + "\t" + r.remotes[name].url + " (fetch)" });
        out.push({ text: name + "\t" + r.remotes[name].url + " (push)" });
      } else out.push({ text: name });
    }
    return ok(out);
  }
  if (sub === "add") {
    const name = positional[1];
    const url = positional[2];
    if (!name || !url) return err("usage: git remote add <name> <url>");
    if (r.remotes[name]) return err("error: remote " + name + " already exists.");
    // мапимо url -> репо за назвою або workspace://id
    let targetId = "";
    if (url.startsWith("workspace://")) targetId = url.slice("workspace://".length);
    else {
      const target = repoByName(ctx.ws, url) || repoByName(ctx.ws, P.basename(url).replace(/\.git$/, ""));
      if (target) targetId = target.id;
    }
    r.remotes[name] = { name, url, targetRepoId: targetId };
    return ok([]);
  }
  if (sub === "remove" || sub === "rm") {
    const name = positional[1];
    if (!r.remotes[name]) return err("error: No such remote: '" + name + "'");
    delete r.remotes[name];
    return ok([]);
  }
  return err("error: Unknown subcommand: " + sub);
}

// ---------- push / pull / fetch / clone ----------
export function push(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, positional } = parseFlags(argv, { bool: ["-u", "--set-upstream", "-f", "--force"] });
  const remoteName = positional[0] ?? "origin";
  const branchName = positional[1] ?? (r.head.type === "branch" ? r.head.branch : "");
  if (!branchName) return err("fatal: You are not currently on a branch.");
  const res = pushBranch(r, ctx.ws, remoteName, branchName, flags["-f"] || flags["--force"]);
  return res;
}
export function pull(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { positional } = parseFlags(argv);
  const remoteName = positional[0] ?? "origin";
  const branchName = positional[1] ?? (r.head.type === "branch" ? r.head.branch : "");
  return pullRemote(r, ctx.ws, remoteName, branchName, ctx.clock);
}
export function fetch(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { positional } = parseFlags(argv);
  return fetchRemote(r, ctx.ws, positional[0] ?? "origin");
}
export function clone(argv: string[], ctx: Ctx): CommandResult {
  const { ws } = ctx;
  const { positional } = parseFlags(argv);
  const url = positional[0];
  if (!url) return err("fatal: You must specify a repository to clone.");
  const srcName = url.startsWith("workspace://") ? null : P.basename(url).replace(/\.git$/, "");
  const src = url.startsWith("workspace://") ? ws.repos[url.slice("workspace://".length)] : repoByName(ws, srcName ?? "");
  if (!src) return fatal("fatal: repository '" + url + "' does not exist");
  const name = positional[1] ?? src.name;
  const cloned = cloneRepo(ws, src.id, name);
  if (!cloned) return fatal("fatal: clone failed");
  ws.currentRepoId = cloned.id;
  return ok([
    { text: "Cloning into '" + name + "'..." },
    { text: "done.", tone: "meta" },
  ]);
}

// ---------- config ----------
export function config(argv: string[], ctx: Ctx): CommandResult {
  const r = currentRepo(ctx.ws);
  const { positional } = parseFlags(argv, { bool: ["--global", "--local", "--list"] });
  const key = positional[0];
  const val = positional[1];
  if (!r) return err("fatal: not in a git repository");
  if (key === "user.name") {
    if (val !== undefined) { r.config.userName = val; return ok([]); }
    return ok([{ text: r.config.userName }]);
  }
  if (key === "user.email") {
    if (val !== undefined) { r.config.userEmail = val; return ok([]); }
    return ok([{ text: r.config.userEmail }]);
  }
  return ok([]);
}

// ---------- tag ----------
export function tag(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, values, positional } = parseFlags(argv, {
    bool: ["-d", "--delete", "-l", "--list", "-a", "-f", "--force"],
    value: ["-m", "--message"],
  });
  void values;
  if (flags["-d"] || flags["--delete"]) {
    const name = positional[0];
    if (!name) return err("fatal: tag name required");
    if (r.tags[name] === undefined) return err("error: tag '" + name + "' not found.");
    const was = r.tags[name];
    delete r.tags[name];
    return ok([{ text: `Deleted tag '${name}' (was ${short(was)})` }]);
  }
  // список тегів
  if (flags["-l"] || flags["--list"] || positional.length === 0) {
    return ok(Object.keys(r.tags).sort().map((n) => ({ text: n })));
  }
  const name = positional[0];
  if (r.tags[name] !== undefined && !(flags["-f"] || flags["--force"]))
    return err("fatal: tag '" + name + "' already exists");
  const refArg = positional[1];
  const target = refArg ? resolveRef(r, refArg) : headCommitOid(r);
  if (!target) return err("fatal: Failed to resolve '" + (refArg ?? "HEAD") + "' as a valid ref.");
  r.tags[name] = target;
  return ok([]);
}

// ---------- show ----------
export function show(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { positional } = parseFlags(argv, { bool: ["--stat"] });
  const ref = positional[0] ?? "HEAD";
  const oid = resolveRef(r, ref);
  if (!oid) return err("fatal: bad revision '" + ref + "'");
  const c = readCommit(r, oid);
  if (!c) return err("fatal: bad object " + ref);
  const out: CommandResult["lines"] = [{ text: "commit " + oid, tone: "warn" }];
  if (c.parents.length > 1) out.push({ text: "Merge: " + c.parents.map((p) => short(p)).join(" "), tone: "meta" });
  out.push({ text: "Author: " + c.author.name + " <" + c.author.email + ">", tone: "out" });
  out.push({ text: "Date:   " + new Date(c.committer.when).toISOString(), tone: "out" });
  out.push({ text: "" });
  for (const line of c.message.split("\n")) out.push({ text: "    " + line, tone: "out" });
  out.push({ text: "" });
  const parentTree = c.parents[0] ? commitTree(r, c.parents[0]) : null;
  for (const ch of treeDiff(r, parentTree, c.tree)) {
    out.push(...unifiedDiff(ch.path, ch.oldText, ch.newText));
  }
  return ok(out);
}

// ---------- restore ----------
export function restore(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, values, positional } = parseFlags(argv, {
    bool: ["--staged", "-S", "--worktree", "-W"],
    value: ["--source", "-s"],
  });
  const files = positional;
  if (!files.length) return err("fatal: you must specify path(s) to restore");
  const staged = flags["--staged"] || flags["-S"];
  const worktree = flags["--worktree"] || flags["-W"] || !staged; // за замовчуванням — робоча тека
  const source = values["--source"] ?? values["-s"];
  let srcMap: Record<string, string> | null = null;
  if (source) {
    const soid = resolveRef(r, source);
    if (!soid) return err("fatal: could not resolve --source=" + source);
    srcMap = treeToFileMap(r, commitTree(r, soid));
  }
  for (const f of files) {
    const rel = toRepoRel(r, P.resolve(ctx.ws.cwd, f));
    if (staged) unstagePath(r, rel); // index -> HEAD
    if (worktree) {
      if (srcMap) {
        if (srcMap[rel] !== undefined) r.workdir.files[rel] = srcMap[rel];
        else delete r.workdir.files[rel];
      } else {
        restoreFiles(r, ctx.ws, [f]); // з індексу (або HEAD)
      }
    }
  }
  return ok([]);
}

// ---------- revert ----------
export function revert(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, positional } = parseFlags(argv, { bool: ["--no-commit", "-n", "--no-edit"] });
  const ref = positional[0];
  if (!ref) return err("fatal: empty commit set passed");
  const oid = resolveRef(r, ref);
  if (!oid) return err("fatal: bad revision '" + ref + "'");
  const c = readCommit(r, oid);
  if (!c) return err("fatal: bad object " + ref);
  if (c.parents.length > 1) return err("error: commit " + short(oid) + " is a merge but no -m option was given.");
  if (r.head.type !== "branch") return err("fatal: not on a branch");

  const parentTree = c.parents[0] ? commitTree(r, c.parents[0]) : null;
  const changes = treeDiff(r, parentTree, c.tree);
  const files = { ...treeToFileMap(r, commitTree(r, headCommitOid(r))) };
  for (const ch of changes) {
    // застосовуємо ЗВОРОТНЄ до того, що зробив коміт
    if (ch.status === "added") delete files[ch.path];
    else files[ch.path] = ch.oldText ?? "";
  }
  r.workdir.files = { ...files };
  r.index = {};
  for (const p of Object.keys(files)) stageFile(r, p);
  const subject = firstLine(c.message);
  if (flags["--no-commit"] || flags["-n"]) {
    return ok([{ text: 'Revert "' + subject + '" — зміни підготовлено, зробіть git commit.', tone: "meta" }]);
  }
  const msg = 'Revert "' + subject + '"\n\nThis reverts commit ' + oid + ".";
  const newOid = createCommit(r, msg, ctx.clock);
  return ok([
    { text: `[${r.head.type === "branch" ? r.head.branch : "?"} ${short(newOid)}] Revert "${subject}"`, tone: "out" },
  ]);
}

// ---------- cherry-pick ----------
export function cherryPick(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { positional } = parseFlags(argv, { bool: ["-x", "--no-commit", "-n"] });
  const ref = positional[0];
  if (!ref) return err("fatal: empty commit set passed");
  const oid = resolveRef(r, ref);
  if (!oid) return err("fatal: bad revision '" + ref + "'");
  const c = readCommit(r, oid);
  if (!c) return err("fatal: bad object " + ref);
  if (r.head.type !== "branch") return err("fatal: not on a branch");

  const parentTree = c.parents[0] ? commitTree(r, c.parents[0]) : null;
  const changes = treeDiff(r, parentTree, c.tree);
  const files = { ...treeToFileMap(r, commitTree(r, headCommitOid(r))) };
  for (const ch of changes) {
    if (ch.status === "deleted") delete files[ch.path];
    else files[ch.path] = ch.newText ?? "";
  }
  r.workdir.files = { ...files };
  r.index = {};
  for (const p of Object.keys(files)) stageFile(r, p);
  const newOid = createCommit(r, c.message, ctx.clock);
  return ok([
    { text: `[${r.head.branch} ${short(newOid)}] ${firstLine(c.message)}`, tone: "out" },
  ]);
}

// ---------- rm ----------
export function rmCmd(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags, positional } = parseFlags(argv, { bool: ["-r", "--cached", "-f", "--force"] });
  if (!positional.length) return err("fatal: No pathspec was given. Which files should I remove?");
  const cached = flags["--cached"];
  const out: CommandResult["lines"] = [];
  for (const spec of positional) {
    const rel = toRepoRel(r, P.resolve(ctx.ws.cwd, spec));
    const prefix = rel + "/";
    const matched = Object.keys(r.workdir.files).filter((p) => p === rel || (flags["-r"] && p.startsWith(prefix)));
    // також файли, що є лише в індексі
    for (const p of Object.keys(r.index)) if ((p === rel || (flags["-r"] && p.startsWith(prefix))) && !matched.includes(p)) matched.push(p);
    if (!matched.length) return err("fatal: pathspec '" + spec + "' did not match any files");
    for (const p of matched.sort()) {
      delete r.index[p];
      if (!cached) delete r.workdir.files[p];
      out.push({ text: "rm '" + p + "'" });
    }
  }
  return ok(out);
}

// ---------- clean ----------
export function clean(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const { flags } = parseFlags(argv, { bool: ["-n", "--dry-run", "-f", "--force", "-d"] });
  const dry = flags["-n"] || flags["--dry-run"];
  const force = flags["-f"] || flags["--force"];
  if (!dry && !force) {
    return err("fatal: clean.requireForce defaults to true and neither -f nor -n given; refusing to clean");
  }
  const st = computeStatus(r);
  const out: CommandResult["lines"] = [];
  for (const p of st.untracked) {
    if (dry) out.push({ text: "Would remove " + p });
    else {
      delete r.workdir.files[p];
      out.push({ text: "Removing " + p });
    }
  }
  if (flags["-d"]) {
    for (const d of r.workdir.dirs.slice()) {
      if (dry) out.push({ text: "Would remove " + d + "/" });
      else {
        r.workdir.dirs = r.workdir.dirs.filter((x) => x !== d);
        out.push({ text: "Removing " + d + "/" });
      }
    }
  }
  return ok(out);
}

// ---------- reflog ----------
export function reflog(argv: string[], ctx: Ctx): CommandResult {
  const r = requireRepo(ctx.ws);
  if (isResult(r)) return r;
  const entries = r.reflog ?? [];
  if (!entries.length) {
    const h = headCommitOid(r);
    if (h) return ok([{ text: `${short(h)} HEAD@{0}: commit: ${firstLine(readCommit(r, h)?.message ?? "")}`, tone: "meta" }]);
    return ok([]);
  }
  return ok(entries.map((e, i) => ({ text: `${short(e.oid)} HEAD@{${i}}: ${e.message}`, tone: "meta" })));
}

// ---------- реєстр ----------
export const GIT: Record<string, (argv: string[], ctx: Ctx) => CommandResult> = {
  init,
  add,
  commit,
  status,
  log,
  diff,
  branch,
  checkout,
  switch: switchCmd,
  merge,
  rebase,
  reset,
  stash,
  remote,
  push,
  pull,
  fetch,
  clone,
  config,
  tag,
  show,
  restore,
  revert,
  "cherry-pick": cherryPick,
  rm: rmCmd,
  clean,
  reflog,
};
