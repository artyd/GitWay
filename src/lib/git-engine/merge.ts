// Злиття: merge-base, fast-forward, три-стороннє злиття з детекцією конфліктів.

import type { Oid, Repo } from "./types";
import { ancestors, readCommit, treeToFileMap } from "./objects";
import { lcsDiff, splitLines } from "./diff";

/** Чи є anc предком desc (або самим desc). */
export function isAncestor(repo: Repo, anc: Oid, desc: Oid): boolean {
  if (anc === desc) return true;
  return ancestors(repo, desc).has(anc);
}

/** Спільний предок (merge-base). Обираємо один — для навчання достатньо. */
export function mergeBase(repo: Repo, a: Oid, b: Oid): Oid | null {
  const ancA = ancestors(repo, a);
  // BFS від b у порядку часу, повертаємо перший, що є предком a
  const seen = new Set<Oid>();
  const queue: Oid[] = [b];
  const found: Oid[] = [];
  while (queue.length) {
    const cur = queue.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    if (ancA.has(cur)) {
      found.push(cur);
      continue; // не спускаємось нижче знайденого спільного предка
    }
    const c = readCommit(repo, cur);
    if (c) for (const p of c.parents) queue.push(p);
  }
  if (!found.length) return null;
  // Обираємо найпізніший за часом
  found.sort((x, y) => (readCommit(repo, y)?.committer.when ?? 0) - (readCommit(repo, x)?.committer.when ?? 0));
  return found[0];
}

export interface Merge3Result {
  text: string;
  conflicts: number;
}

/** Три-стороннє злиття вмісту одного файла (diff3-стиль). */
export function merge3(
  base: string,
  ours: string,
  theirs: string,
  labels: { ours: string; theirs: string },
): Merge3Result {
  if (ours === theirs) return { text: ours, conflicts: 0 };
  if (ours === base) return { text: theirs, conflicts: 0 };
  if (theirs === base) return { text: ours, conflicts: 0 };

  const baseL = splitLines(base);
  const oursL = splitLines(ours);
  const theirsL = splitLines(theirs);

  // Вирівнюємо кожну сторону з базою через LCS, потім проходимо синхронно.
  const oursOps = lcsDiff(baseL, oursL);
  const theirsOps = lcsDiff(baseL, theirsL);

  // Перетворюємо на «події за рядком бази»: для кожного рядка бази — що з ним зробили.
  const oursChanges = alignToBase(oursOps);
  const theirsChanges = alignToBase(theirsOps);

  const out: string[] = [];
  let conflicts = 0;
  const nBase = baseL.length;

  // Спочатку — вставки перед базою (індекс -1)
  emitInserts(out, oursChanges.pre, theirsChanges.pre, labels, () => conflicts++);

  for (let i = 0; i < nBase; i++) {
    const o = oursChanges.at[i];
    const t = theirsChanges.at[i];
    // Стан рядка бази: kept (той самий), deleted, або replaced
    const oKept = o.kept;
    const tKept = t.kept;
    if (oKept && tKept) {
      out.push(baseL[i]);
    } else if (oKept && !tKept) {
      // theirs змінив/видалив
      for (const l of t.replacement) out.push(l);
    } else if (!oKept && tKept) {
      for (const l of o.replacement) out.push(l);
    } else {
      // обидва змінили
      if (sameLines(o.replacement, t.replacement)) {
        for (const l of o.replacement) out.push(l);
      } else {
        conflicts++;
        pushConflict(out, o.replacement, t.replacement, labels);
      }
    }
    // вставки після цього рядка бази
    emitInserts(out, o.post, t.post, labels, () => conflicts++);
  }

  const text = out.length ? out.join("\n") + "\n" : "";
  return { text, conflicts };
}

interface LineChange {
  kept: boolean; // рядок бази лишився без змін
  replacement: string[]; // якщо змінено — на що (порожньо = видалено)
  post: string[]; // вставки одразу після цього рядка бази
}
interface Aligned {
  pre: string[]; // вставки до першого рядка бази
  at: LineChange[]; // по одному на рядок бази
}

/** Розкладає edit-script (base -> side) на зміни, привʼязані до рядків бази. */
function alignToBase(ops: { tag: "eq" | "add" | "del"; line: string }[]): Aligned {
  const at: LineChange[] = [];
  const pre: string[] = [];
  let pendingAdds: string[] = [];
  let curBase = -1; // ще не бачили жодного рядка бази

  const flushAddsToPost = () => {
    if (curBase < 0) {
      pre.push(...pendingAdds);
    } else {
      at[curBase].post.push(...pendingAdds);
    }
    pendingAdds = [];
  };

  for (const op of ops) {
    if (op.tag === "eq") {
      flushAddsToPost();
      at.push({ kept: true, replacement: [], post: [] });
      curBase = at.length - 1;
    } else if (op.tag === "del") {
      flushAddsToPost();
      // рядок бази видалено/замінено; спочатку позначаємо видаленим,
      // наступні add одразу після стануть його заміною
      at.push({ kept: false, replacement: [], post: [] });
      curBase = at.length - 1;
    } else {
      // add
      if (curBase >= 0 && !at[curBase].kept && at[curBase].post.length === 0) {
        // add одразу після del -> це заміна видаленого рядка
        at[curBase].replacement.push(op.line);
      } else {
        pendingAdds.push(op.line);
      }
    }
  }
  flushAddsToPost();
  return { pre, at };
}

function emitInserts(
  out: string[],
  ours: string[],
  theirs: string[],
  labels: { ours: string; theirs: string },
  onConflict: () => void,
) {
  if (!ours.length && !theirs.length) return;
  if (sameLines(ours, theirs)) {
    out.push(...ours);
  } else if (!ours.length) {
    out.push(...theirs);
  } else if (!theirs.length) {
    out.push(...ours);
  } else {
    onConflict();
    pushConflict(out, ours, theirs, labels);
  }
}

function pushConflict(
  out: string[],
  ours: string[],
  theirs: string[],
  labels: { ours: string; theirs: string },
) {
  out.push("<<<<<<< " + labels.ours);
  out.push(...ours);
  out.push("=======");
  out.push(...theirs);
  out.push(">>>>>>> " + labels.theirs);
}

function sameLines(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export type MergeKind = "upToDate" | "ff" | "clean" | "conflict";
export interface MergeResult {
  kind: MergeKind;
  conflicts: string[]; // шляхи з конфліктами
  mergedFiles: Record<string, string>; // підсумковий вміст файлів (для clean/conflict)
}

/**
 * Обчислює результат злиття theirs у ours (без застосування).
 * Викликач застосовує: для ff — просто пересуває ref; для clean — коміт; для conflict — пише робочу директорію.
 */
export function computeMerge(repo: Repo, ours: Oid, theirs: Oid, theirLabel: string): MergeResult {
  if (isAncestor(repo, theirs, ours)) {
    return { kind: "upToDate", conflicts: [], mergedFiles: {} };
  }
  if (isAncestor(repo, ours, theirs)) {
    return { kind: "ff", conflicts: [], mergedFiles: treeToFileMap(repo, commitTreeOid(repo, theirs)) };
  }
  const baseOid = mergeBase(repo, ours, theirs);
  const baseFiles = treeToFileMap(repo, baseOid ? commitTreeOid(repo, baseOid) : null);
  const oursFiles = treeToFileMap(repo, commitTreeOid(repo, ours));
  const theirsFiles = treeToFileMap(repo, commitTreeOid(repo, theirs));

  const allPaths = new Set([
    ...Object.keys(baseFiles),
    ...Object.keys(oursFiles),
    ...Object.keys(theirsFiles),
  ]);

  const merged: Record<string, string> = {};
  const conflicts: string[] = [];

  for (const p of allPaths) {
    const b = baseFiles[p];
    const o = oursFiles[p];
    const t = theirsFiles[p];

    // Видалення/додавання
    if (o === undefined && t === undefined) continue;
    if (b === undefined && o !== undefined && t === undefined) {
      merged[p] = o; // додано лише в ours
      continue;
    }
    if (b === undefined && t !== undefined && o === undefined) {
      merged[p] = t; // додано лише в theirs
      continue;
    }
    if (o === undefined && t !== undefined) {
      // ми видалили, вони змінили?
      if (t === b) continue; // обидва «видалили» ефективно
      // конфлікт видалення/зміни -> лишаємо theirs з маркером
      conflicts.push(p);
      merged[p] =
        "<<<<<<< HEAD (видалено)\n=======\n" + ensureNl(t) + ">>>>>>> " + theirLabel + "\n";
      continue;
    }
    if (t === undefined && o !== undefined) {
      if (o === b) continue; // theirs видалив, ours без змін -> видалити
      conflicts.push(p);
      merged[p] =
        "<<<<<<< HEAD\n" + ensureNl(o) + "=======\n>>>>>>> " + theirLabel + " (видалено)\n";
      continue;
    }

    const base = b ?? "";
    const res = merge3(base, o!, t!, { ours: "HEAD", theirs: theirLabel });
    merged[p] = res.text;
    if (res.conflicts > 0) conflicts.push(p);
  }

  return { kind: conflicts.length ? "conflict" : "clean", conflicts, mergedFiles: merged };
}

function commitTreeOid(repo: Repo, oid: Oid): Oid | null {
  const c = readCommit(repo, oid);
  return c ? c.tree : null;
}

function ensureNl(s: string): string {
  return s.endsWith("\n") ? s : s + "\n";
}
