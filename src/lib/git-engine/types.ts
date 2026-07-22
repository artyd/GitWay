// Типи моделі даних Git-рушія. Усе — прості обʼєкти/масиви/Record без Map/Set
// та класів, тому JSON.stringify зберігає стан у localStorage без втрат.

export type Oid = string; // 40-символьний hex-хеш; показуємо скорочено до 7 символів

export interface Signature {
  name: string;
  email: string;
  when: number; // epoch ms
}

export interface Blob {
  type: "blob";
  oid: Oid;
  content: string;
}

export interface FileEntry {
  name: string;
  mode: "100644" | "040000";
  oid: Oid;
  kind: "blob" | "tree";
}

export interface Tree {
  type: "tree";
  oid: Oid;
  entries: FileEntry[]; // відсортовані за name
}

export interface Commit {
  type: "commit";
  oid: Oid;
  tree: Oid;
  parents: Oid[]; // 0=root, 1=звичайний, 2+=merge
  author: Signature;
  committer: Signature;
  message: string;
}

export type GitObject = Blob | Tree | Commit;

export type Head =
  | { type: "branch"; branch: string } // приєднаний HEAD
  | { type: "detached"; oid: Oid }; // відʼєднаний HEAD

export interface IndexEntry {
  path: string; // posix-шлях відносно кореня репозиторію
  oid: Oid;
  mode: "100644";
}
export type Index = Record<string, IndexEntry>;

export interface WorkingDir {
  files: Record<string, string>; // шлях -> вміст (джерело правди робочої директорії)
  dirs: string[]; // явно створені порожні каталоги (git їх ігнорує, fs-команди — ні)
}

export interface StashEntry {
  message: string;
  when: number;
  base: Oid; // HEAD-коміт на момент stash
  workTree: Oid; // знімок дерева робочої директорії
  indexTree: Oid; // знімок дерева індексу
}

export interface Remote {
  name: string;
  url: string; // "workspace://<id>"
  targetRepoId: string;
}

export interface ReviewComment {
  id: string;
  author: string;
  body: string;
  when: number;
}

export type ReviewVerdict = "approved" | "changes_requested" | "commented";

export interface Review {
  id: string;
  author: string;
  verdict: ReviewVerdict;
  body: string;
  when: number;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  sourceBranch: string;
  targetBranch: string;
  state: "open" | "merged" | "closed";
  author: string;
  createdAt: number;
  comments: ReviewComment[];
  reviews: Review[];
  // diff / список комітів / mergeable рахуються на льоту, не зберігаються
}

export interface Issue {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  author: string;
  createdAt: number;
  comments: ReviewComment[];
}

export interface RepoConfig {
  defaultBranch: string;
  userName: string;
  userEmail: string;
}

export interface Repo {
  id: string;
  name: string;
  root: string; // абсолютний posix-шлях кореня робочої директорії, напр. "/home/user/marketing-plan"
  objects: Record<Oid, GitObject>;
  branches: Record<string, Oid>; // 'main' -> commit oid
  remoteBranches: Record<string, Oid>; // 'origin/main' -> commit oid (tracking)
  tags: Record<string, Oid>;
  head: Head;
  index: Index;
  workdir: WorkingDir;
  stash: StashEntry[];
  remotes: Record<string, Remote>;
  pullRequests: PullRequest[];
  issues: Issue[];
  nextPrNumber: number;
  nextIssueNumber: number;
  config: RepoConfig;
  initialized: boolean;
  // Стан незавершеного злиття (конфлікт) — щоб git status / commit це бачили.
  mergeHead?: Oid;
  mergeMessage?: string;
}

export interface Workspace {
  version: 1;
  account: string; // розділ localStorage
  repos: Record<string, Repo>;
  currentRepoId: string | null;
  cwd: string; // абсолютний posix, напр. "/home/user/marketing-plan/src"
  env: Record<string, string>;
  nextRepoSeq: number; // для генерації id репозиторіїв
  // Полегшена «файлова система» поза репозиторіями (домашня тека), щоб працювало
  // mkdir/cd/touch до git init. Ключі — абсолютні posix-шляхи.
  looseFiles: Record<string, string>;
  looseDirs: string[];
}

export const HOME = "/home/user";

// ---- контракт вводу/виводу команд ----

export type Tone =
  | "out"
  | "cmd"
  | "err"
  | "add"
  | "del"
  | "meta"
  | "section"
  | "hint"
  | "branch"
  | "warn";

export interface OutLine {
  text: string;
  tone?: Tone;
}

export interface CommandResult {
  code: number;
  lines: OutLine[];
}

export const ok = (lines: OutLine[] = []): CommandResult => ({ code: 0, lines });
export const err = (msg: string): CommandResult => ({
  code: 1,
  lines: [{ text: msg, tone: "err" }],
});
export const fatal = (msg: string): CommandResult => ({
  code: 128,
  lines: [{ text: msg, tone: "err" }],
});

// ---- звіт про стан (спільний оракул для терміналу та GitHub-UI) ----

export type StagedKind = "new" | "modified" | "deleted";
export type UnstagedKind = "modified" | "deleted";

export interface StatusReport {
  branch: string | null;
  detached: boolean;
  head: Oid | null;
  ahead: number;
  behind: number;
  upstream: string | null;
  staged: { path: string; kind: StagedKind }[];
  unstaged: { path: string; kind: UnstagedKind }[];
  untracked: string[];
  conflicts: string[];
  merging: boolean;
}
