// Підсвічування командного рядка «на льоту» (поки користувач друкує).
// Кожен токен отримує колір за роллю: команда/підкоманда (валідна/невалідна),
// прапорець, рядок у лапках, аргумент. Використовується оверлеєм у терміналі.

import { FS } from "./commands";
import { GIT } from "./commands/git";

export interface HlToken {
  text: string;
  color: string;
}

// Кольори під темний фон терміналу (#0f2a27).
const COLORS = {
  cmdOk: "#2dd4bf", // валідна команда — бірюзова
  cmdBad: "#ff6b5e", // невідома команда — червона
  subOk: "#8fb8ff", // валідна підкоманда git — блакитна
  subBad: "#ff6b5e",
  flag: "#f2c94c", // прапорці — бурштинові
  str: "#7ee6a0", // рядок у лапках — зелений
  op: "#c3a6ff", // оператори (|, >, &&) — фіолетові
  arg: "#eafaf7", // звичайний аргумент — світлий
  space: "#eafaf7",
};

const FS_CMDS = new Set(Object.keys(FS).concat(["git", "clear", "help", "whoami"]));
const GIT_SUBS = new Set(Object.keys(GIT));

const isSpace = (c: string) => c === " " || c === "\t";
const isQuote = (c: string) => c === '"' || c === "'";

/**
 * Розбиває рядок на кольорові токени, зберігаючи КОЖЕН символ (включно з
 * пробілами й лапками), щоб оверлей точно збігався з текстом інпуту.
 */
export function gitHighlight(line: string): HlToken[] {
  const out: HlToken[] = [];
  let i = 0;
  let wordIndex = 0; // порядковий номер «слова» (не рахуючи пробілів)
  let sawGit = false;
  const n = line.length;

  while (i < n) {
    const ch = line[i];

    // пробіли — окремий токен
    if (isSpace(ch)) {
      let j = i;
      while (j < n && isSpace(line[j])) j++;
      out.push({ text: line.slice(i, j), color: COLORS.space });
      i = j;
      continue;
    }

    // оператори shell
    if (ch === "|" || ch === ";" || ch === ">" || ch === "&") {
      let j = i;
      while (j < n && (line[j] === "|" || line[j] === ";" || line[j] === ">" || line[j] === "&")) j++;
      out.push({ text: line.slice(i, j), color: COLORS.op });
      i = j;
      wordIndex = 0; // після оператора — нова команда
      sawGit = false;
      continue;
    }

    // рядок у лапках
    if (isQuote(ch)) {
      const q = ch;
      let j = i + 1;
      while (j < n && line[j] !== q) j++;
      if (j < n) j++; // закриваюча лапка
      out.push({ text: line.slice(i, j), color: COLORS.str });
      i = j;
      wordIndex++;
      continue;
    }

    // звичайне слово (до пробілу/лапки/оператора)
    let j = i;
    while (j < n && !isSpace(line[j]) && !isQuote(line[j]) && !"|;>&".includes(line[j])) j++;
    const word = line.slice(i, j);
    out.push({ text: word, color: classify(word, wordIndex, sawGit) });
    if (wordIndex === 0 && word === "git") sawGit = true;
    wordIndex++;
    i = j;
  }

  return out;
}

function classify(word: string, wordIndex: number, sawGit: boolean): string {
  if (word.startsWith("-")) return COLORS.flag;
  if (wordIndex === 0) return FS_CMDS.has(word) ? COLORS.cmdOk : COLORS.cmdBad;
  if (sawGit && wordIndex === 1) return GIT_SUBS.has(word) ? COLORS.subOk : COLORS.subBad;
  return COLORS.arg;
}
