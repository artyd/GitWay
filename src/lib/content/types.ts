// Типи авторського контенту (JSON), що завантажується окремо від UI-коду.
// Рантайм-типи Lesson/QuizQuestion/Command живуть у gitway-data.ts і тут лише
// імпортуються (import type — стирається, тож без рантайм-циклів).

import type { Lesson, QuizQuestion, Command } from "../gitway-data";

/** Прийнятна відповідь у командному квізі: літерал, регекс або посилання на команду каталогу. */
export type AcceptPattern =
  | { kind: "literal"; value: string } // нормалізоване порівняння рядків
  | { kind: "regex"; source: string; flags?: string }
  | { kind: "cmd"; id: string }; // розкривається з accept/aliases/cmd запису каталогу

/**
 * Питання квізу CLI-уроку. Два види (легший mix):
 *  - введення: задано `accept` (валідація введеної команди за патернами);
 *  - вибір: задано `options` + `correct` (обрати правильну команду зі списку).
 */
export type CommandQuizQuestion = {
  scenario: string;
  explanation: string; // показується після відповіді
  hint?: string;
  accept?: AcceptPattern[]; // режим введення: будь-яке співпадіння = правильно
  options?: string[]; // режим вибору: варіанти команд
  correct?: number; // індекс правильного варіанта у options
};

/**
 * Авторська форма уроку (JSON): без id та phase (їх присвоює завантажувач за
 * порядком і заголовком файлу), quiz необовʼязковий (нормалізується до []).
 */
export type AuthoredLesson = Omit<Lesson, "id" | "phase" | "quiz"> & {
  quiz?: QuizQuestion[];
};

/** Файл курсу: заголовок (фаза + назва) + рівно 12 уроків. */
export type LessonFile = {
  phase: number;
  course: string;
  lessons: AuthoredLesson[];
};

/** Запис уніфікованого каталогу команд — єдине джерело для Тренажера, CLI-вкладки та квізів. */
export type CatalogEntry = {
  id: string;
  cat: Command["cat"];
  cmd: string;
  desc: string;
  example: string;
  aliases?: string[]; // додаткові написання, що теж «зараховуються»
  accept?: AcceptPattern[]; // канонічні прийнятні відповіді для повторного використання у квізах
};
