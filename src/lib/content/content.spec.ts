import { describe, it, expect } from "vitest";
import { LESSONS, TOTAL_LESSONS, CMDS, PHASE_IDS } from "@/lib/gitway-data";
import { matchesAccept } from "./matchCommand";
import { validateLessonFile } from "./validate";
import { CATALOG, CATALOG_IDS } from "./catalog";
import type { LessonFile } from "./types";

describe("завантаження курсів у LESSONS", () => {
  it("додає два курси по 12 уроків із суцільними id та фазами 4/5", () => {
    expect(TOTAL_LESSONS).toBe(35);
    expect(PHASE_IDS).toEqual([1, 2, 3, 4, 5]);
    // суцільні id 1..35
    LESSONS.forEach((l, i) => expect(l.id).toBe(i + 1));
    const phase4 = LESSONS.filter((l) => l.phase === 4);
    const phase5 = LESSONS.filter((l) => l.phase === 5);
    expect(phase4).toHaveLength(12);
    expect(phase5).toHaveLength(12);
    expect(phase4[0].id).toBe(12);
    expect(phase5[0].id).toBe(24);
  });

  it("кожен урок CLI-курсів має 5-питальний командний квіз і sandbox", () => {
    for (const l of LESSONS.filter((x) => x.phase >= 4)) {
      expect(l.commandQuiz).toBeDefined();
      expect(l.commandQuiz).toHaveLength(5);
      expect(l.sandbox.steps.length).toBeGreaterThan(0);
      expect(Array.isArray(l.quiz)).toBe(true); // нормалізовано до []
    }
  });

  it("базові 11 уроків лишились MCQ (без commandQuiz)", () => {
    for (const l of LESSONS.filter((x) => x.phase <= 3)) {
      expect(l.commandQuiz).toBeUndefined();
      expect(l.quiz.length).toBeGreaterThan(0);
    }
  });
});

describe("валідація контенту падає гучно", () => {
  const good: LessonFile = {
    phase: 4,
    course: "Test",
    lessons: Array.from({ length: 12 }, () => ({
      icon: "fa-solid fa-x",
      title: "t",
      duration: "1 хв",
      xp: 10,
      analogy: "a",
      sections: [{ h: "h", body: ["b"] }],
      sandbox: { title: "s", intro: "i", steps: [{ do: "x", res: "y" }] },
      commandQuiz: Array.from({ length: 5 }, () => ({
        scenario: "s",
        accept: [{ kind: "literal" as const, value: "git init" }],
        explanation: "e",
      })),
    })),
  };

  it("приймає коректний файл", () => {
    expect(() => validateLessonFile(good)).not.toThrow();
  });
  it("відхиляє неправильну кількість уроків", () => {
    expect(() => validateLessonFile({ ...good, lessons: good.lessons.slice(0, 11) })).toThrow(/12 уроків/);
  });
  it("відхиляє квіз не з 5 питань", () => {
    const bad = structuredClone(good);
    bad.lessons[0].commandQuiz = bad.lessons[0].commandQuiz!.slice(0, 3);
    expect(() => validateLessonFile(bad)).toThrow(/5 питань/);
  });
  it("відхиляє посилання на невідому команду каталогу", () => {
    const bad = structuredClone(good);
    bad.lessons[0].commandQuiz![0].accept = [{ kind: "cmd", id: "no-such-id" }];
    expect(() => validateLessonFile(bad)).toThrow(/невідому команду/);
  });
  it("відхиляє некоректний regex", () => {
    const bad = structuredClone(good);
    bad.lessons[0].commandQuiz![0].accept = [{ kind: "regex", source: "([" }];
    expect(() => validateLessonFile(bad)).toThrow(/regex/);
  });
});

describe("matchesAccept — валідація командних відповідей", () => {
  it("літерал (нормалізований)", () => {
    expect(matchesAccept("  GIT   init ", [{ kind: "literal", value: "git init" }])).toBe(true);
    expect(matchesAccept("git status", [{ kind: "literal", value: "git init" }])).toBe(false);
  });
  it("regex приймає варіанти прапорців", () => {
    const acc = [{ kind: "regex" as const, source: "^claude\\s+(-p|--print)\\s+.+" }];
    expect(matchesAccept('claude -p "fix"', acc)).toBe(true);
    expect(matchesAccept('claude --print "fix"', acc)).toBe(true);
    expect(matchesAccept("claude", acc)).toBe(false);
  });
  it("cmd-посилання розкриває accept/aliases/cmd з каталогу", () => {
    // /init має literal accept у каталозі
    expect(matchesAccept("/init", [{ kind: "cmd", id: "c2" }])).toBe(true);
    // claude має aliases ["claude code"]
    expect(matchesAccept("claude code", [{ kind: "cmd", id: "c1" }])).toBe(true);
    expect(matchesAccept("claude", [{ kind: "cmd", id: "c1" }])).toBe(true);
  });
});

describe("уніфікований каталог", () => {
  it("CMDS походить з каталогу (унікальні id, є claude/codex)", () => {
    expect(CMDS.length).toBe(CATALOG.length);
    expect(CATALOG_IDS.size).toBe(CATALOG.length); // немає дублікатів id
    expect(CMDS.some((c) => c.cat === "claude")).toBe(true);
    expect(CMDS.some((c) => c.cat === "codex")).toBe(true);
  });
  it("усі cmd-посилання квізів існують у каталозі", () => {
    for (const l of LESSONS) {
      for (const q of l.commandQuiz ?? []) {
        for (const a of q.accept) {
          if (a.kind === "cmd") expect(CATALOG_IDS.has(a.id)).toBe(true);
        }
      }
    }
  });
});
