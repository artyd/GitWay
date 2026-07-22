// Tab-доповнення для CLI-симулятора: кандидати з таблиці команд (slash + базові).

import type { Completion } from "@/lib/git-engine/complete";
import type { SimTable } from "./types";

export function simComplete(table: SimTable): (line: string, cursor: number) => Completion {
  // Кандидати = «літеральні» початки команд із таблиці (exact/prefix).
  const candidates = Array.from(
    new Set(
      table.entries
        .filter((e) => e.match.kind === "exact" || e.match.kind === "prefix")
        .map((e) => firstToken(e.match.value))
        .filter(Boolean),
    ),
  ).sort();

  return (line: string, cursor: number): Completion => {
    const upto = line.slice(0, cursor);
    const partial = /\s/.test(upto) ? upto.slice(upto.lastIndexOf(" ") + 1) : upto;
    const replaceFrom = cursor - partial.length;
    const matches = candidates.filter((c) => c.startsWith(partial));
    return { replaceFrom, candidates: matches, commonPrefix: longestCommonPrefix(matches, partial) };
  };
}

function firstToken(cmd: string): string {
  const t = cmd.trim().split(/\s+/)[0];
  return t;
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
