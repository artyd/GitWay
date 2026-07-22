// Чисті posix-операції зі шляхами. НІКОЛИ не використовуємо node:path (хост — win32).

/** Нормалізує posix-шлях: прибирає "." / ".." / подвійні слеші. */
export function normalize(p: string): string {
  const isAbs = p.startsWith("/");
  const parts = p.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (out.length && out[out.length - 1] !== "..") out.pop();
      else if (!isAbs) out.push("..");
      // для абсолютного шляху ".." у корені ігнорується
    } else {
      out.push(part);
    }
  }
  return (isAbs ? "/" : "") + out.join("/");
}

/** Обʼєднує сегменти у нормалізований posix-шлях. */
export function join(...parts: string[]): string {
  return normalize(parts.filter((p) => p !== "").join("/"));
}

/** Резолвить target відносно base (обидва posix). Абсолютний target повертається як є. */
export function resolve(base: string, target: string): string {
  if (target.startsWith("/")) return normalize(target);
  return normalize(base + "/" + target);
}

export function dirname(p: string): string {
  const n = normalize(p);
  const i = n.lastIndexOf("/");
  if (i < 0) return ".";
  if (i === 0) return "/";
  return n.slice(0, i);
}

export function basename(p: string): string {
  const n = normalize(p);
  const i = n.lastIndexOf("/");
  return i < 0 ? n : n.slice(i + 1);
}

/** Чи є child всередині dir (або дорівнює dir). Обидва абсолютні нормалізовані. */
export function isInside(dir: string, child: string): boolean {
  if (dir === child) return true;
  const d = dir === "/" ? "/" : dir + "/";
  return child.startsWith(d);
}

/** Відносний posix-шлях від base до target (обидва абсолютні). */
export function relative(base: string, target: string): string {
  const b = normalize(base).split("/").filter(Boolean);
  const t = normalize(target).split("/").filter(Boolean);
  let i = 0;
  while (i < b.length && i < t.length && b[i] === t[i]) i++;
  const up = b.slice(i).map(() => "..");
  const down = t.slice(i);
  const rel = up.concat(down).join("/");
  return rel === "" ? "." : rel;
}

/** Сегменти шляху без порожніх. */
export function segments(p: string): string[] {
  return normalize(p).split("/").filter(Boolean);
}
