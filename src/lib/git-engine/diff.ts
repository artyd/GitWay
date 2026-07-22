// Порядково-рядковий diff (LCS) для git diff та diff у комітах/PR.

import type { OutLine, Oid, Repo } from "./types";
import { readBlob, treeToMap } from "./objects";

export type DiffTag = "eq" | "add" | "del";
export interface DiffOp {
  tag: DiffTag;
  line: string;
}

/** Класичний LCS diff двох масивів рядків -> список операцій. */
export function lcsDiff(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  // dp[i][j] = довжина LCS a[i:] та b[j:]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ tag: "eq", line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ tag: "del", line: a[i] });
      i++;
    } else {
      ops.push({ tag: "add", line: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ tag: "del", line: a[i++] });
  while (j < m) ops.push({ tag: "add", line: b[j++] });
  return ops;
}

const splitLines = (t: string): string[] => {
  if (t === "") return [];
  const lines = t.split("\n");
  if (lines[lines.length - 1] === "") lines.pop(); // прибираємо хвостовий перенос
  return lines;
};

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  ops: DiffOp[];
}

/** Групує операції diff у хунки з контекстом. */
export function hunks(ops: DiffOp[], context = 3): Hunk[] {
  // Індекси операцій, що не є контекстом
  const changeIdx = ops.map((o, i) => (o.tag === "eq" ? -1 : i)).filter((i) => i >= 0);
  if (!changeIdx.length) return [];
  const result: Hunk[] = [];
  let start = 0;
  while (start < changeIdx.length) {
    let end = start;
    while (
      end + 1 < changeIdx.length &&
      changeIdx[end + 1] - changeIdx[end] <= context * 2 + 1
    ) {
      end++;
    }
    const from = Math.max(0, changeIdx[start] - context);
    const to = Math.min(ops.length - 1, changeIdx[end] + context);
    const slice = ops.slice(from, to + 1);
    // порахувати старт/довжини
    let oldStart = 1;
    let newStart = 1;
    for (let k = 0; k < from; k++) {
      if (ops[k].tag !== "add") oldStart++;
      if (ops[k].tag !== "del") newStart++;
    }
    let oldLines = 0;
    let newLines = 0;
    for (const o of slice) {
      if (o.tag !== "add") oldLines++;
      if (o.tag !== "del") newLines++;
    }
    result.push({ oldStart, oldLines, newStart, newLines, ops: slice });
    start = end + 1;
  }
  return result;
}

/** Уніфікований diff одного файла -> кольорові рядки виводу. */
export function unifiedDiff(
  path: string,
  oldText: string | null,
  newText: string | null,
  context = 3,
): OutLine[] {
  const out: OutLine[] = [];
  const a = oldText === null ? [] : splitLines(oldText);
  const b = newText === null ? [] : splitLines(newText);
  const ops = lcsDiff(a, b);
  if (!ops.some((o) => o.tag !== "eq")) return out; // без змін

  const aName = oldText === null ? "/dev/null" : "a/" + path;
  const bName = newText === null ? "/dev/null" : "b/" + path;
  out.push({ text: "diff --git a/" + path + " b/" + path, tone: "meta" });
  if (oldText === null) out.push({ text: "new file mode 100644", tone: "meta" });
  if (newText === null) out.push({ text: "deleted file mode 100644", tone: "meta" });
  out.push({ text: "--- " + aName, tone: "meta" });
  out.push({ text: "+++ " + bName, tone: "meta" });

  for (const h of hunks(ops, context)) {
    out.push({
      text: `@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`,
      tone: "section",
    });
    for (const o of h.ops) {
      if (o.tag === "eq") out.push({ text: " " + o.line, tone: "out" });
      else if (o.tag === "add") out.push({ text: "+" + o.line, tone: "add" });
      else out.push({ text: "-" + o.line, tone: "del" });
    }
  }
  return out;
}

export interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted";
  oldText: string | null;
  newText: string | null;
  additions: number;
  deletions: number;
}

/** Перелік змін файлів між двома деревами. */
export function treeDiff(repo: Repo, oldTree: Oid | null, newTree: Oid | null): FileChange[] {
  const oldMap = treeToMap(repo, oldTree);
  const newMap = treeToMap(repo, newTree);
  const paths = Array.from(new Set([...Object.keys(oldMap), ...Object.keys(newMap)])).sort();
  const changes: FileChange[] = [];
  for (const p of paths) {
    const oOid = oldMap[p];
    const nOid = newMap[p];
    if (oOid === nOid) continue;
    const oldText = oOid ? readBlob(repo, oOid)?.content ?? "" : null;
    const newText = nOid ? readBlob(repo, nOid)?.content ?? "" : null;
    const status: FileChange["status"] = !oOid ? "added" : !nOid ? "deleted" : "modified";
    const { additions, deletions } = countChanges(oldText, newText);
    changes.push({ path: p, status, oldText, newText, additions, deletions });
  }
  return changes;
}

export function countChanges(
  oldText: string | null,
  newText: string | null,
): { additions: number; deletions: number } {
  const ops = lcsDiff(
    oldText === null ? [] : splitLines(oldText),
    newText === null ? [] : splitLines(newText),
  );
  let additions = 0;
  let deletions = 0;
  for (const o of ops) {
    if (o.tag === "add") additions++;
    else if (o.tag === "del") deletions++;
  }
  return { additions, deletions };
}

export { splitLines };
