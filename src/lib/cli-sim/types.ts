// Типи симулятора агентних CLI (Claude Code / Codex). Таблиця команд-відповідей
// живе в JSON — тож набір команд легко оновлювати без перезбирання.

import type { OutLine } from "@/lib/git-engine/types";

export type PermissionMode = "default" | "plan" | "auto-accept" | "read-only";
export type ApprovalLevel = "suggest" | "auto-edit" | "full-auto";

export type SimState = {
  cwd: string;
  mode: PermissionMode;
  model: string;
  approvals: ApprovalLevel;
  hasProjectDoc: boolean; // CLAUDE.md / AGENTS.md створено (/init)
  activeSubagent?: string;
};

export type SimMatch = { kind: "exact" | "prefix" | "regex"; value: string; flags?: string };

export type SimResponse = {
  lines: OutLine[];
  setState?: Partial<SimState>;
  clear?: boolean; // → сентинел \x00CLEAR
};

export type SimEntry = {
  match: SimMatch;
  when?: Partial<SimState>; // спрацьовує лише за відповідного стану сесії
  response: SimResponse;
  priority?: number; // вищий виграє за нічиєї
};

export type SimTable = {
  tool: "claude" | "codex";
  prompt: string; // напр. "claude>"
  title: string; // напр. "claude code — сесія"
  seed: OutLine[]; // банер при відкритті
  initialState?: Partial<SimState>;
  entries: SimEntry[];
  fallback: SimResponse; // «команду не розпізнано»
};
