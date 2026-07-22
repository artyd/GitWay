// Завантажувач уроків: приєднує JSON-курси до базових уроків, присвоюючи
// суцільні id (позиційно) та phase із заголовка файлу. quiz нормалізується до [].

import type { Lesson } from "../gitway-data";
import type { LessonFile } from "./types";
import { validateLessonFile } from "./validate";

export function buildLessons(base: Lesson[], files: LessonFile[]): Lesson[] {
  let nextId = base.length + 1; // 12
  const extra: Lesson[] = [];
  for (const f of files) {
    validateLessonFile(f);
    for (const l of f.lessons) {
      extra.push({
        ...l,
        id: nextId++,
        phase: f.phase,
        quiz: l.quiz ?? [], // рантайм-тип гарантує масив (renderer гілкує на commandQuiz)
      });
    }
  }
  return base.concat(extra);
}
