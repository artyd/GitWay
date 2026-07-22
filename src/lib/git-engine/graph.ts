// Розкладка графа комітів у «доріжки» (lanes) для візуалізації гілок.

import type { Commit, Oid, Repo } from "./types";
import { commitHistory } from "./objects";

export interface GraphNode {
  oid: Oid;
  row: number;
  lane: number;
  commit: Commit;
  parents: { oid: Oid; lane: number }[];
  refs: string[];
  color: string;
}

const LANE_COLORS = [
  "#14b8a6",
  "#7c6ee0",
  "#e6a15a",
  "#e0679b",
  "#5cb85c",
  "#4a9fd8",
  "#d98c4a",
];

/** Обчислює доріжки для всіх комітів, досяжних з гілок репо. */
export function computeGraph(repo: Repo, maxRows = 60): GraphNode[] {
  const tips = Object.values(repo.branches);
  if (!tips.length) return [];
  // усі коміти в порядку часу (новіші зверху)
  const all: Commit[] = dedupeCommits(tips.flatMap((t) => commitHistory(repo, t)));
  all.sort((a, b) => b.committer.when - a.committer.when || (a.oid < b.oid ? 1 : -1));
  const commits = all.slice(0, maxRows);

  const refs = refMap(repo);

  // Активні доріжки: lane -> oid, який очікується наступним у цій доріжці
  const laneExpect: (Oid | null)[] = [];
  const nodes: GraphNode[] = [];

  const findFreeLane = (): number => {
    for (let i = 0; i < laneExpect.length; i++) if (laneExpect[i] === null) return i;
    laneExpect.push(null);
    return laneExpect.length - 1;
  };

  commits.forEach((commit, row) => {
    // знаходимо доріжку, що очікує цей коміт
    let lane = laneExpect.findIndex((e) => e === commit.oid);
    if (lane === -1) {
      lane = findFreeLane();
    } else {
      // звільняємо будь-які інші доріжки, що теж очікували цей коміт (злиття)
      for (let i = 0; i < laneExpect.length; i++) if (i !== lane && laneExpect[i] === commit.oid) laneExpect[i] = null;
    }

    // первинний батько лишається у цій доріжці
    const parentLanes: { oid: Oid; lane: number }[] = [];
    if (commit.parents.length) {
      laneExpect[lane] = commit.parents[0];
      parentLanes.push({ oid: commit.parents[0], lane });
      // додаткові батьки (merge) отримують нові доріжки
      for (let p = 1; p < commit.parents.length; p++) {
        const existing = laneExpect.findIndex((e) => e === commit.parents[p]);
        const pl = existing === -1 ? findFreeLane() : existing;
        if (existing === -1) laneExpect[pl] = commit.parents[p];
        parentLanes.push({ oid: commit.parents[p], lane: pl });
      }
    } else {
      laneExpect[lane] = null; // корінь
    }

    nodes.push({
      oid: commit.oid,
      row,
      lane,
      commit,
      parents: parentLanes,
      refs: refs[commit.oid] ?? [],
      color: LANE_COLORS[lane % LANE_COLORS.length],
    });
  });

  return nodes;
}

function dedupeCommits(commits: Commit[]): Commit[] {
  const seen = new Set<Oid>();
  const out: Commit[] = [];
  for (const c of commits) {
    if (seen.has(c.oid)) continue;
    seen.add(c.oid);
    out.push(c);
  }
  return out;
}

function refMap(repo: Repo): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const head = repo.head.type === "branch" ? repo.head.branch : null;
  for (const b of Object.keys(repo.branches)) {
    (map[repo.branches[b]] ??= []).push(b === head ? "● " + b : b);
  }
  for (const rb of Object.keys(repo.remoteBranches)) {
    (map[repo.remoteBranches[rb]] ??= []).push(rb);
  }
  if (repo.head.type === "detached") (map[repo.head.oid] ??= []).push("HEAD");
  return map;
}

export const laneColor = (lane: number): string => LANE_COLORS[lane % LANE_COLORS.length];
