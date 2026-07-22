// Єдина нормалізована форма уроку для багатого відео-шаблону (Git + CLI).

import gitData from "./lessons.json";
import cliData from "./cli-lessons.json";
import { PHASES } from "./common";

export type NCommand = { cmd: string; desc: string };
export type NLesson = {
  id: number;
  phase: number;
  title: string;
  kicker: string; // напис над заголовком
  lead: string; // провідний абзац
  blocks: string[]; // абзаци теорії
  commands: NCommand[]; // для анімованого терміналу
  icon: "robot" | "wand" | "branch"; // головна іконка теми
};

type GitLesson = {
  id: number; phase: number; title: string; analogy: string;
  sections: { h: string; body: string[] }[];
  sandbox: { title: string; intro: string; steps: { do: string; res: string }[] };
};
type CliLesson = {
  id: number; phase: number; course: string; pos: number; total: number;
  title: string; lead: string; paragraphs: string[]; commands: NCommand[];
};

const strip = (s: string) => (s.startsWith("• ") ? s.slice(2) : s);
const iconFor = (phase: number): NLesson["icon"] => (phase === 5 ? "wand" : phase >= 4 ? "robot" : "branch");

function fromGit(l: GitLesson): NLesson {
  return {
    id: l.id,
    phase: l.phase,
    title: l.title,
    kicker: `УРОК ${l.id} · ${PHASES[l.phase].name.toUpperCase()}`,
    lead: (l.analogy || "").split("\n\n")[0],
    blocks: l.sections.flatMap((s) => s.body.map(strip)).filter(Boolean),
    commands: l.sandbox.steps.map((st) => ({ cmd: st.do, desc: st.res })),
    icon: iconFor(l.phase),
  };
}

function fromCli(l: CliLesson): NLesson {
  return {
    id: l.id,
    phase: l.phase,
    title: l.title,
    kicker: `${l.course.toUpperCase()} · УРОК ${l.pos} / ${l.total}`,
    lead: l.lead,
    blocks: (l.paragraphs || []).filter(Boolean),
    commands: l.commands || [],
    icon: iconFor(l.phase),
  };
}

const all: NLesson[] = [
  ...(gitData as unknown as GitLesson[]).map(fromGit),
  ...(cliData as unknown as CliLesson[]).map(fromCli),
];

const byId: Record<number, NLesson> = Object.fromEntries(all.map((l) => [l.id, l]));
export const getN = (id: number): NLesson => byId[id];
export const allN = all;
