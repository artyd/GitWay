// Публічний бар'єл CLI-симулятора + завантаження таблиць із JSON.

import claudeTable from "@/content/cli-sim/claude.json";
import codexTable from "@/content/cli-sim/codex.json";
import type { SimTable } from "./types";

export { CliSim } from "./CliSim";
export { simComplete } from "./complete";
export type { SimTable, SimState, SimEntry } from "./types";

export const SIM_TABLES: Record<"claude" | "codex", SimTable> = {
  claude: claudeTable as SimTable,
  codex: codexTable as SimTable,
};

export const CLI_TOOLS: { key: "claude" | "codex"; name: string; icon: string; color: string }[] = [
  { key: "claude", name: "Claude Code", icon: "fa-solid fa-robot", color: "#7c6ee0" },
  { key: "codex", name: "Codex CLI", icon: "fa-solid fa-wand-magic-sparkles", color: "#d98b3d" },
];
