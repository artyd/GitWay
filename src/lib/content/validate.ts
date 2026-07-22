// Рантайм-перевірка авторського контенту: гучно падає при некоректному JSON,
// щоб помилковий «вкинутий» контент не рендерився поламаним уроком.

import type { AcceptPattern, LessonFile } from "./types";
import { CATALOG_IDS } from "./catalog";

const LESSONS_PER_COURSE = 12;
const QUESTIONS_PER_QUIZ = 5;

export function validateLessonFile(f: LessonFile): void {
  const label = f.course || "?";
  if (typeof f.phase !== "number") throw new Error(`content: курс "${label}": відсутнє числове поле phase`);
  if (!Array.isArray(f.lessons)) throw new Error(`content: курс "${label}": lessons має бути масивом`);
  if (f.lessons.length !== LESSONS_PER_COURSE) {
    throw new Error(`content: курс "${label}": очікується ${LESSONS_PER_COURSE} уроків, отримано ${f.lessons.length}`);
  }

  f.lessons.forEach((l, i) => {
    const at = (msg: string) => `content: курс "${label}" урок ${i + 1}: ${msg}`;
    if (!l.title) throw new Error(at("порожній title"));
    if (!l.duration) throw new Error(at("порожній duration"));
    if (!l.analogy) throw new Error(at("порожня analogy"));
    if (!Array.isArray(l.sections) || l.sections.length === 0) throw new Error(at("немає sections"));
    if (!l.sandbox || !Array.isArray(l.sandbox.steps)) throw new Error(at("немає sandbox.steps"));

    if (l.commandQuiz !== undefined) {
      if (l.commandQuiz.length !== QUESTIONS_PER_QUIZ) {
        throw new Error(at(`commandQuiz має містити ${QUESTIONS_PER_QUIZ} питань, а не ${l.commandQuiz.length}`));
      }
      l.commandQuiz.forEach((q, qi) => {
        const atq = (msg: string) => at(`питання ${qi + 1}: ${msg}`);
        if (!q.scenario) throw new Error(atq("порожній scenario"));
        if (!q.explanation) throw new Error(atq("порожнє explanation"));
        if (!Array.isArray(q.accept) || q.accept.length === 0) throw new Error(atq("немає accept-патернів"));
        q.accept.forEach((a) => validateAccept(a, atq));
      });
    }
  });
}

function validateAccept(a: AcceptPattern, atq: (msg: string) => string): void {
  if (a.kind === "literal") {
    if (!a.value) throw new Error(atq("порожній literal-патерн"));
  } else if (a.kind === "regex") {
    try {
      new RegExp(a.source, a.flags);
    } catch {
      throw new Error(atq(`некоректний regex «${a.source}»`));
    }
  } else if (a.kind === "cmd") {
    if (!CATALOG_IDS.has(a.id)) throw new Error(atq(`посилання на невідому команду каталогу «${a.id}»`));
  } else {
    throw new Error(atq("невідомий вид accept-патерну"));
  }
}
