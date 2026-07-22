// Форматери виводу в стилі справжнього git (текст збігається з реальним git).

import type { Commit, OutLine, Repo, StatusReport } from "../types";
import { short } from "../oid";

const UA = {
  new: "новий файл",
  modified: "змінено",
  deleted: "видалено",
};

export function formatStatus(repo: Repo, st: StatusReport): OutLine[] {
  const out: OutLine[] = [];
  if (st.detached) out.push({ text: "HEAD detached at " + short(st.head ?? ""), tone: "meta" });
  else out.push({ text: "On branch " + (st.branch ?? "?"), tone: "meta" });

  if (st.upstream) {
    if (st.ahead && st.behind) {
      out.push({ text: `Your branch and '${st.upstream}' have diverged,`, tone: "meta" });
      out.push({ text: `and have ${st.ahead} and ${st.behind} different commits each.`, tone: "meta" });
    } else if (st.ahead) {
      out.push({ text: `Your branch is ahead of '${st.upstream}' by ${st.ahead} commit(s).`, tone: "meta" });
    } else if (st.behind) {
      out.push({ text: `Your branch is behind '${st.upstream}' by ${st.behind} commit(s).`, tone: "meta" });
    } else {
      out.push({ text: `Your branch is up to date with '${st.upstream}'.`, tone: "meta" });
    }
  }

  if (st.merging) {
    out.push({ text: "You have unmerged paths.", tone: "warn" });
    out.push({ text: '  (fix conflicts and run "git commit")', tone: "hint" });
  }

  const nothingStaged = st.staged.length === 0;
  const nothingUnstaged = st.unstaged.length === 0 && st.conflicts.length === 0;
  const nothingUntracked = st.untracked.length === 0;

  if (st.staged.length) {
    out.push({ text: "" });
    out.push({ text: "Changes to be committed:", tone: "meta" });
    out.push({ text: '  (use "git restore --staged <file>..." to unstage)', tone: "hint" });
    for (const s of st.staged) {
      out.push({ text: `\t${pad(UA[s.kind])}   ${s.path}`, tone: "add" });
    }
  }

  if (st.conflicts.length) {
    out.push({ text: "" });
    out.push({ text: "Unmerged paths:", tone: "meta" });
    out.push({ text: '  (use "git add <file>..." to mark resolution)', tone: "hint" });
    for (const p of st.conflicts) out.push({ text: `\tboth modified:   ${p}`, tone: "err" });
  }

  if (st.unstaged.length) {
    out.push({ text: "" });
    out.push({ text: "Changes not staged for commit:", tone: "meta" });
    out.push({ text: '  (use "git add <file>..." to update what will be committed)', tone: "hint" });
    for (const s of st.unstaged) {
      out.push({ text: `\t${pad(UA[s.kind])}   ${s.path}`, tone: "del" });
    }
  }

  if (st.untracked.length) {
    out.push({ text: "" });
    out.push({ text: "Untracked files:", tone: "meta" });
    out.push({ text: '  (use "git add <file>..." to include in what will be committed)', tone: "hint" });
    for (const p of st.untracked) out.push({ text: `\t${p}`, tone: "err" });
  }

  if (nothingStaged && nothingUnstaged && nothingUntracked) {
    out.push({ text: "nothing to commit, working tree clean", tone: "meta" });
  } else if (nothingStaged && !st.merging) {
    out.push({ text: "" });
    out.push({ text: 'no changes added to commit (use "git add")', tone: "meta" });
  }
  void repo;
  return out;
}

function pad(s: string): string {
  return (s + ":").padEnd(14, " ");
}

export function formatLog(repo: Repo, commits: Commit[], oneline: boolean): OutLine[] {
  const out: OutLine[] = [];
  const refsAt = branchRefs(repo);
  if (oneline) {
    for (const c of commits) {
      const decoration = refsAt[c.oid] ? " (" + refsAt[c.oid].join(", ") + ")" : "";
      out.push({ text: short(c.oid) + decoration + " " + firstLine(c.message), tone: "out" });
    }
    return out;
  }
  commits.forEach((c, i) => {
    if (i > 0) out.push({ text: "" });
    const decoration = refsAt[c.oid] ? " (" + refsAt[c.oid].join(", ") + ")" : "";
    out.push({ text: "commit " + c.oid + decoration, tone: "branch" });
    if (c.parents.length > 1) out.push({ text: "Merge: " + c.parents.map(short).join(" "), tone: "meta" });
    out.push({ text: "Author: " + c.author.name + " <" + c.author.email + ">", tone: "meta" });
    out.push({ text: "Date:   " + new Date(c.author.when).toUTCString(), tone: "meta" });
    out.push({ text: "" });
    for (const line of c.message.split("\n")) out.push({ text: "    " + line });
  });
  return out;
}

function branchRefs(repo: Repo): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const head = repo.head.type === "branch" ? repo.head.branch : null;
  for (const b of Object.keys(repo.branches)) {
    const oid = repo.branches[b];
    (map[oid] ??= []).push(b === head ? "HEAD -> " + b : b);
  }
  for (const rb of Object.keys(repo.remoteBranches)) {
    const oid = repo.remoteBranches[rb];
    (map[oid] ??= []).push(rb);
  }
  return map;
}

export function firstLine(s: string): string {
  const i = s.indexOf("\n");
  return i < 0 ? s : s.slice(0, i);
}
