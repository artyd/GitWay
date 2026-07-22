// Віртуальна файлова система над робочими директоріями репозиторіїв та
// «домашньою» текою поза репо. Працює з абсолютними posix-шляхами.

import { HOME, type Repo, type Workspace } from "./types";
import * as P from "./path";
import { repoAt } from "./workspace";

export type Loc =
  | { kind: "repo"; repo: Repo; rel: string } // rel === "" -> корінь репо
  | { kind: "loose"; abs: string };

export function locate(ws: Workspace, abs: string): Loc {
  const norm = P.normalize(abs);
  const repo = repoAt(ws, norm);
  if (repo) return { kind: "repo", repo, rel: P.relative(repo.root, norm) === "." ? "" : P.relative(repo.root, norm) };
  return { kind: "loose", abs: norm };
}

export function fileExists(ws: Workspace, abs: string): boolean {
  const loc = locate(ws, abs);
  if (loc.kind === "repo") return loc.rel !== "" && loc.repo.workdir.files[loc.rel] !== undefined;
  return ws.looseFiles[loc.abs] !== undefined;
}

export function readFile(ws: Workspace, abs: string): string | null {
  const loc = locate(ws, abs);
  if (loc.kind === "repo") return loc.rel !== "" ? loc.repo.workdir.files[loc.rel] ?? null : null;
  return ws.looseFiles[loc.abs] ?? null;
}

export function writeFile(ws: Workspace, abs: string, content: string): void {
  const loc = locate(ws, abs);
  if (loc.kind === "repo") {
    if (loc.rel !== "") loc.repo.workdir.files[loc.rel] = content;
  } else {
    ws.looseFiles[loc.abs] = content;
  }
}

export function dirExists(ws: Workspace, abs: string): boolean {
  const norm = P.normalize(abs);
  if (norm === "/" || norm === "/home" || norm === HOME) return true;
  // корінь будь-якого репо
  for (const id of Object.keys(ws.repos)) if (ws.repos[id].root === norm) return true;
  const loc = locate(ws, norm);
  if (loc.kind === "repo") {
    if (loc.rel === "") return true;
    const prefix = loc.rel + "/";
    if (loc.repo.workdir.dirs.includes(loc.rel)) return true;
    for (const f of Object.keys(loc.repo.workdir.files)) if (f.startsWith(prefix)) return true;
    for (const d of loc.repo.workdir.dirs) if (d.startsWith(prefix)) return true;
    return false;
  }
  // loose
  if (ws.looseDirs.includes(norm)) return true;
  const prefix = norm === "/" ? "/" : norm + "/";
  for (const d of ws.looseDirs) if (d.startsWith(prefix)) return true;
  for (const f of Object.keys(ws.looseFiles)) if (f.startsWith(prefix)) return true;
  for (const id of Object.keys(ws.repos)) if (ws.repos[id].root.startsWith(prefix)) return true;
  return false;
}

export function makeDir(ws: Workspace, abs: string): void {
  const loc = locate(ws, abs);
  if (loc.kind === "repo") {
    if (loc.rel !== "" && !loc.repo.workdir.dirs.includes(loc.rel)) loc.repo.workdir.dirs.push(loc.rel);
  } else {
    if (!ws.looseDirs.includes(loc.abs)) ws.looseDirs.push(loc.abs);
  }
}

export function removeFile(ws: Workspace, abs: string): boolean {
  const loc = locate(ws, abs);
  if (loc.kind === "repo") {
    if (loc.rel !== "" && loc.repo.workdir.files[loc.rel] !== undefined) {
      delete loc.repo.workdir.files[loc.rel];
      return true;
    }
    return false;
  }
  if (ws.looseFiles[loc.abs] !== undefined) {
    delete ws.looseFiles[loc.abs];
    return true;
  }
  return false;
}

/** Рекурсивно видаляє каталог з усім вмістом. */
export function removeDir(ws: Workspace, abs: string): void {
  const norm = P.normalize(abs);
  const loc = locate(ws, norm);
  if (loc.kind === "repo") {
    const prefix = loc.rel === "" ? "" : loc.rel + "/";
    for (const f of Object.keys(loc.repo.workdir.files)) {
      if (loc.rel === "" || f === loc.rel || f.startsWith(prefix)) delete loc.repo.workdir.files[f];
    }
    loc.repo.workdir.dirs = loc.repo.workdir.dirs.filter(
      (d) => !(loc.rel === "" || d === loc.rel || d.startsWith(prefix)),
    );
  } else {
    const prefix = norm + "/";
    for (const f of Object.keys(ws.looseFiles)) if (f === norm || f.startsWith(prefix)) delete ws.looseFiles[f];
    ws.looseDirs = ws.looseDirs.filter((d) => !(d === norm || d.startsWith(prefix)));
  }
}

/** Перелік вмісту каталогу: назви піддиректорій (з "/") та файлів. */
export function listDir(ws: Workspace, abs: string): { dirs: string[]; files: string[] } {
  const norm = P.normalize(abs);
  const dirs = new Set<string>();
  const files = new Set<string>();

  const consider = (childAbs: string, isDir: boolean) => {
    // childAbs — прямий або глибший нащадок norm
    if (!P.isInside(norm, childAbs) || childAbs === norm) return;
    const rel = P.relative(norm, childAbs);
    const first = rel.split("/")[0];
    if (rel.includes("/")) dirs.add(first);
    else if (isDir) dirs.add(first);
    else files.add(first);
  };

  // домашня тека: показуємо корені репо + loose
  if (norm === HOME || norm === "/home" || norm === "/") {
    for (const id of Object.keys(ws.repos)) consider(ws.repos[id].root, true);
  }
  // якщо всередині репо
  const loc = locate(ws, norm);
  if (loc.kind === "repo") {
    for (const f of Object.keys(loc.repo.workdir.files)) consider(P.join(loc.repo.root, f), false);
    for (const d of loc.repo.workdir.dirs) consider(P.join(loc.repo.root, d), true);
  } else {
    for (const f of Object.keys(ws.looseFiles)) consider(f, false);
    for (const d of ws.looseDirs) consider(d, true);
    for (const id of Object.keys(ws.repos)) consider(ws.repos[id].root, true);
  }

  return { dirs: Array.from(dirs).sort(), files: Array.from(files).sort() };
}
