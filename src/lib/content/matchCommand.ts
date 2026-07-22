// Валідатор командних відповідей: спільний для квізів і Тренажера.

import type { AcceptPattern } from "./types";
import { CATALOG_BY_ID } from "./catalog";

export const norm = (s: string): string => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Чи задовольняє введена команда хоч один з прийнятних патернів.
 * literal — нормалізована рівність; regex — тест «сирого» вводу;
 * cmd — розкриття accept/aliases/cmd із каталогу (із захистом від циклів).
 */
export function matchesAccept(input: string, patterns: AcceptPattern[], seen = new Set<string>()): boolean {
  const raw = input.trim();
  const n = norm(input);
  if (!raw) return false;
  for (const p of patterns) {
    if (p.kind === "literal") {
      if (n === norm(p.value)) return true;
    } else if (p.kind === "regex") {
      try {
        if (new RegExp(p.source, p.flags ?? "i").test(raw)) return true;
      } catch {
        /* некоректний регекс ігноруємо */
      }
    } else if (p.kind === "cmd") {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const entry = CATALOG_BY_ID[p.id];
      if (entry) {
        if (entry.accept && matchesAccept(input, entry.accept, seen)) return true;
        if (n === norm(entry.cmd)) return true;
        if (entry.aliases && entry.aliases.some((a) => n === norm(a))) return true;
      }
    }
  }
  return false;
}
