// Розбір командного рядка на argv з підтримкою лапок, escape та перенаправлення.

export function tokenize(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let has = false;
  let i = 0;
  const n = line.length;
  while (i < n) {
    const ch = line[i];
    if (ch === " " || ch === "\t") {
      if (has) {
        out.push(cur);
        cur = "";
        has = false;
      }
      i++;
      continue;
    }
    if (ch === "'") {
      has = true;
      i++;
      while (i < n && line[i] !== "'") cur += line[i++];
      i++; // закриваюча лапка
      continue;
    }
    if (ch === '"') {
      has = true;
      i++;
      while (i < n && line[i] !== '"') {
        if (line[i] === "\\" && i + 1 < n && (line[i + 1] === '"' || line[i + 1] === "\\")) {
          cur += line[i + 1];
          i += 2;
        } else {
          cur += line[i++];
        }
      }
      i++;
      continue;
    }
    if (ch === "\\" && i + 1 < n) {
      has = true;
      cur += line[i + 1];
      i += 2;
      continue;
    }
    has = true;
    cur += ch;
    i++;
  }
  if (has) out.push(cur);
  return out;
}

export interface Redirect {
  op: ">" | ">>";
  file: string;
}

/** Витягує перенаправлення (> / >>) з argv. */
export function parseRedirect(argv: string[]): { argv: string[]; redirect?: Redirect } {
  const out: string[] = [];
  let redirect: Redirect | undefined;
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === ">" || t === ">>") {
      const file = argv[i + 1];
      if (file) {
        redirect = { op: t, file };
        i++;
      }
    } else if (t.startsWith(">>")) {
      redirect = { op: ">>", file: t.slice(2) };
    } else if (t.startsWith(">")) {
      redirect = { op: ">", file: t.slice(1) };
    } else {
      out.push(t);
    }
  }
  return { argv: out, redirect };
}

export interface FlagSpec {
  bool?: string[]; // прапорці без значення, напр. ["--force","-f"]
  value?: string[]; // прапорці зі значенням, напр. ["-m","--message"]
}

export interface ParsedFlags {
  flags: Record<string, boolean>;
  values: Record<string, string>;
  positional: string[];
}

/** Простий розбір прапорців для однієї підкоманди. */
export function parseFlags(argv: string[], spec: FlagSpec = {}): ParsedFlags {
  const bool = new Set(spec.bool ?? []);
  const value = new Set(spec.value ?? []);
  const flags: Record<string, boolean> = {};
  const values: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (value.has(t)) {
      values[t] = argv[i + 1] ?? "";
      i++;
    } else if (bool.has(t)) {
      flags[t] = true;
    } else if (t.startsWith("--") && t.includes("=")) {
      const eq = t.indexOf("=");
      const key = t.slice(0, eq);
      if (value.has(key)) values[key] = t.slice(eq + 1);
      else flags[key] = true;
    } else {
      positional.push(t);
    }
  }
  return { flags, values, positional };
}
