// Читання/запис git-обʼєктів та матеріалізація дерев з плаского індексу.

import type {
  Blob,
  Commit,
  FileEntry,
  GitObject,
  Index,
  Oid,
  Repo,
  Signature,
  Tree,
} from "./types";
import { hash } from "./oid";

// ---------- запис/читання ----------

export function writeObject(repo: Repo, obj: GitObject): Oid {
  repo.objects[obj.oid] = obj;
  return obj.oid;
}

export function makeBlob(repo: Repo, content: string): Oid {
  const oid = blobOid(content);
  if (!repo.objects[oid]) writeObject(repo, { type: "blob", oid, content });
  return oid;
}

/** Oid вмісту без запису обʼєкта (для порівнянь у git status). */
export function blobOid(content: string): Oid {
  return hash("blob\0" + content);
}

export function makeTree(repo: Repo, entries: FileEntry[]): Oid {
  const sorted = entries.slice().sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const ser = sorted.map((e) => e.mode + " " + e.kind + " " + e.oid + " " + e.name).join("\n");
  const oid = hash("tree\0" + ser);
  if (!repo.objects[oid]) writeObject(repo, { type: "tree", oid, entries: sorted });
  return oid;
}

export function makeCommit(
  repo: Repo,
  tree: Oid,
  parents: Oid[],
  author: Signature,
  committer: Signature,
  message: string,
): Oid {
  const ser =
    "commit\0" +
    tree +
    "\n" +
    parents.join(",") +
    "\n" +
    author.name +
    "|" +
    author.email +
    "|" +
    author.when +
    "\n" +
    committer.name +
    "|" +
    committer.email +
    "|" +
    committer.when +
    "\n" +
    message;
  const oid = hash(ser);
  writeObject(repo, { type: "commit", oid, tree, parents, author, committer, message });
  return oid;
}

export function getObject(repo: Repo, oid: Oid): GitObject | null {
  return repo.objects[oid] ?? null;
}
export function readBlob(repo: Repo, oid: Oid): Blob | null {
  const o = repo.objects[oid];
  return o && o.type === "blob" ? o : null;
}
export function readTree(repo: Repo, oid: Oid): Tree | null {
  const o = repo.objects[oid];
  return o && o.type === "tree" ? o : null;
}
export function readCommit(repo: Repo, oid: Oid): Commit | null {
  const o = repo.objects[oid];
  return o && o.type === "commit" ? o : null;
}

// ---------- матеріалізація дерева з індексу ----------

type NestNode = { blobs: Record<string, Oid>; dirs: Record<string, NestNode> };
const emptyNode = (): NestNode => ({ blobs: {}, dirs: {} });

/** Будує вкладені дерева з плаского індексу, записує їх і повертає oid кореня. */
export function buildTreeFromIndex(repo: Repo, index: Index): Oid {
  const root = emptyNode();
  for (const path of Object.keys(index)) {
    const parts = path.split("/");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      if (!node.dirs[seg]) node.dirs[seg] = emptyNode();
      node = node.dirs[seg];
    }
    node.blobs[parts[parts.length - 1]] = index[path].oid;
  }
  return writeNode(repo, root);
}

function writeNode(repo: Repo, node: NestNode): Oid {
  const entries: FileEntry[] = [];
  for (const name of Object.keys(node.blobs)) {
    entries.push({ name, mode: "100644", kind: "blob", oid: node.blobs[name] });
  }
  for (const name of Object.keys(node.dirs)) {
    const oid = writeNode(repo, node.dirs[name]);
    entries.push({ name, mode: "040000", kind: "tree", oid });
  }
  return makeTree(repo, entries);
}

/** Пласка мапа шлях->oid усіх блобів у дереві (рекурсивно). */
export function treeToMap(repo: Repo, treeOid: Oid | null): Record<string, Oid> {
  const out: Record<string, Oid> = {};
  if (!treeOid) return out;
  const walk = (oid: Oid, prefix: string) => {
    const tree = readTree(repo, oid);
    if (!tree) return;
    for (const e of tree.entries) {
      const p = prefix ? prefix + "/" + e.name : e.name;
      if (e.kind === "blob") out[p] = e.oid;
      else walk(e.oid, p);
    }
  };
  walk(treeOid, "");
  return out;
}

/** Пласка мапа шлях->вміст усіх файлів у дереві. */
export function treeToFileMap(repo: Repo, treeOid: Oid | null): Record<string, string> {
  const map = treeToMap(repo, treeOid);
  const out: Record<string, string> = {};
  for (const p of Object.keys(map)) {
    const b = readBlob(repo, map[p]);
    out[p] = b ? b.content : "";
  }
  return out;
}

// ---------- ref / HEAD ----------

/** Коміт, на який вказує HEAD (або null у щойно ініціалізованому репо). */
export function headCommitOid(repo: Repo): Oid | null {
  if (repo.head.type === "detached") return repo.head.oid;
  return repo.branches[repo.head.branch] ?? null;
}

export function headCommit(repo: Repo): Commit | null {
  const oid = headCommitOid(repo);
  return oid ? readCommit(repo, oid) : null;
}

export function currentBranch(repo: Repo): string | null {
  return repo.head.type === "branch" ? repo.head.branch : null;
}

/** Резолвить назву/oid у commit oid. Підтримує гілки, віддалені гілки, теги, HEAD, короткий oid. */
export function resolveRef(repo: Repo, ref: string): Oid | null {
  if (ref === "HEAD") return headCommitOid(repo);
  if (repo.branches[ref]) return repo.branches[ref];
  if (repo.remoteBranches[ref]) return repo.remoteBranches[ref];
  if (repo.tags[ref]) return repo.tags[ref];
  if (repo.objects[ref] && repo.objects[ref].type === "commit") return ref;
  // короткий oid
  if (ref.length >= 4) {
    const matches = Object.keys(repo.objects).filter(
      (o) => o.startsWith(ref) && repo.objects[o].type === "commit",
    );
    if (matches.length === 1) return matches[0];
  }
  return null;
}

// ---------- досяжність (для push/pull/clone та GC) ----------

/** Усі oid обʼєктів, досяжні з набору комітів (коміти + дерева + блоби). */
export function reachable(repo: Repo, from: Oid[]): Set<Oid> {
  const seen = new Set<Oid>();
  const stack = from.slice();
  const addTree = (oid: Oid) => {
    if (seen.has(oid)) return;
    seen.add(oid);
    const tree = readTree(repo, oid);
    if (!tree) return;
    for (const e of tree.entries) {
      if (e.kind === "tree") addTree(e.oid);
      else seen.add(e.oid);
    }
  };
  while (stack.length) {
    const oid = stack.pop()!;
    if (seen.has(oid)) continue;
    const c = readCommit(repo, oid);
    if (!c) continue;
    seen.add(oid);
    addTree(c.tree);
    for (const p of c.parents) if (!seen.has(p)) stack.push(p);
  }
  return seen;
}

/** Усі коміти-предки oid (включно з ним самим). */
export function ancestors(repo: Repo, oid: Oid): Set<Oid> {
  const seen = new Set<Oid>();
  const stack = [oid];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    const c = readCommit(repo, cur);
    if (!c) continue;
    seen.add(cur);
    for (const p of c.parents) stack.push(p);
  }
  return seen;
}

/** Лінійна історія від коміту через первинних предків (для git log). */
export function commitHistory(repo: Repo, from: Oid | null): Commit[] {
  const out: Commit[] = [];
  const seen = new Set<Oid>();
  // Обхід у порядку часу (топологічно-часовий), збираємо всі досяжні коміти.
  const all: Commit[] = [];
  const stack: Oid[] = from ? [from] : [];
  while (stack.length) {
    const oid = stack.pop()!;
    if (seen.has(oid)) continue;
    seen.add(oid);
    const c = readCommit(repo, oid);
    if (!c) continue;
    all.push(c);
    for (const p of c.parents) stack.push(p);
  }
  all.sort((a, b) => b.committer.when - a.committer.when);
  out.push(...all);
  return out;
}
