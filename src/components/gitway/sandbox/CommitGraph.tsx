"use client";

import { sx } from "@/lib/sx";
import { computeGraph, short, type GraphNode } from "@/lib/git-engine";
import type { Repo } from "@/lib/git-engine";

const ROW_H = 46;
const LANE_W = 22;
const DOT_R = 6;
const PAD_X = 16;

export function CommitGraph({
  repo,
  onSelect,
  selected,
}: {
  repo: Repo;
  onSelect?: (oid: string) => void;
  selected?: string | null;
}) {
  const nodes = computeGraph(repo);
  if (!nodes.length) {
    return (
      <div style={sx("padding:24px;text-align:center;color:#8b9c97;font-weight:600")}>
        Ще немає комітів. Зробіть перший коміт у терміналі.
      </div>
    );
  }
  const rowByOid: Record<string, GraphNode> = {};
  for (const n of nodes) rowByOid[n.oid] = n;
  const maxLane = Math.max(...nodes.map((n) => Math.max(n.lane, ...n.parents.map((p) => p.lane))));
  const graphW = PAD_X * 2 + (maxLane + 1) * LANE_W;
  const height = nodes.length * ROW_H;
  const cx = (lane: number) => PAD_X + lane * LANE_W + LANE_W / 2;
  const cy = (row: number) => row * ROW_H + ROW_H / 2;

  return (
    <div style={sx("display:flex;align-items:stretch;overflow-x:auto")}>
      <svg width={graphW} height={height} style={{ flex: "none" }}>
        {/* ребра до батьків */}
        {nodes.map((n) =>
          n.parents.map((p) => {
            const parent = rowByOid[p.oid];
            if (!parent) return null;
            const x1 = cx(n.lane);
            const y1 = cy(n.row);
            const x2 = cx(p.lane);
            const y2 = cy(parent.row);
            const d =
              n.lane === p.lane
                ? `M${x1},${y1} L${x2},${y2}`
                : `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`;
            return <path key={n.oid + p.oid} d={d} stroke={rowByOid[p.oid].color} strokeWidth={2.5} fill="none" />;
          }),
        )}
        {nodes.map((n) => (
          <circle
            key={n.oid}
            cx={cx(n.lane)}
            cy={cy(n.row)}
            r={n.oid === selected ? DOT_R + 2 : DOT_R}
            fill={n.color}
            stroke={n.oid === selected ? "#14332f" : "#fff"}
            strokeWidth={n.oid === selected ? 3 : 2.5}
          />
        ))}
      </svg>
      <div style={sx("flex:1;min-width:0")}>
        {nodes.map((n) => (
          <button
            key={n.oid}
            onClick={() => onSelect?.(n.oid)}
            style={{
              ...sx(
                "display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:none;cursor:pointer;background:" +
                  (n.oid === selected ? "#eafaf7" : "transparent") +
                  ";padding:0 14px;border-radius:10px",
              ),
              height: ROW_H,
            }}
          >
            <span style={sx("font-family:ui-monospace,Menlo,monospace;font-size:12px;font-weight:700;color:#8b9c97;flex:none")}>
              {short(n.oid)}
            </span>
            {n.refs.map((r) => (
              <span
                key={r}
                style={sx(
                  `flex:none;padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:800;color:#fff;background:${n.color}`,
                )}
              >
                {r}
              </span>
            ))}
            <span style={sx("font-weight:700;font-size:13.5px;color:#14332f;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>
              {firstLine(n.commit.message)}
            </span>
            <span style={sx("margin-left:auto;flex:none;font-size:11.5px;color:#a7b6b1;font-weight:600")}>
              {n.commit.author.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function firstLine(s: string): string {
  const i = s.indexOf("\n");
  return i < 0 ? s : s.slice(0, i);
}
