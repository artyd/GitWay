"use client";

// Мінімальний структурний інтерфейс, який має задовольняти будь-який «двигун»
// терміналу (GitEngine для пісочниці, CliSim для CLI-вкладки). Дозволяє
// компоненту Terminal працювати з обома без дублювання.

import { useSyncExternalStore } from "react";
import type { CommandResult } from "@/lib/git-engine/types";

export interface TerminalBackend {
  exec(line: string): CommandResult; // повертає CommandResult; сентинел \x00CLEAR очищає екран
  cwd(): string;
  subscribe(fn: () => void): () => void;
  getVersion(): number;
}

/** Підписка на версію бекенда (примітив → без зациклення useSyncExternalStore). */
export function useBackendVersion(b: Pick<TerminalBackend, "subscribe" | "getVersion">): number {
  return useSyncExternalStore(b.subscribe, b.getVersion, () => 0);
}
