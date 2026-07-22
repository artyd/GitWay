"use client";

import { sx } from "@/lib/sx";
import { Icon } from "../ui";
import { unifiedDiff, type FileChange } from "@/lib/git-engine";

const STATUS_UA: Record<FileChange["status"], string> = {
  added: "додано",
  modified: "змінено",
  deleted: "видалено",
};
const STATUS_COLOR: Record<FileChange["status"], string> = {
  added: "#22a06b",
  modified: "#c3a24a",
  deleted: "#c0392b",
};

export function DiffView({ changes }: { changes: FileChange[] }) {
  if (!changes.length) {
    return (
      <div style={sx("padding:26px;text-align:center;color:#8b9c97;font-weight:600")}>
        <Icon name="fa-solid fa-equals" /> Немає змін між цими станами.
      </div>
    );
  }
  return (
    <div style={sx("display:flex;flex-direction:column;gap:16px")}>
      {changes.map((ch) => {
        const lines = unifiedDiff(ch.path, ch.oldText, ch.newText);
        const body = lines.filter((l) => l.tone !== "meta"); // ховаємо технічні заголовки diff --git
        return (
          <div key={ch.path} style={sx("border-radius:16px;overflow:hidden;border:1px solid #e4ebe8;background:#fff")}>
            <div style={sx("display:flex;align-items:center;gap:10px;padding:11px 16px;background:#f5f8f7;border-bottom:1px solid #e4ebe8")}>
              <Icon name="fa-solid fa-file-code" style={sx("color:#8b9c97")} />
              <span style={sx("font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:13.5px")}>{ch.path}</span>
              <span style={sx(`margin-left:6px;font-size:11.5px;font-weight:800;color:${STATUS_COLOR[ch.status]}`)}>
                {STATUS_UA[ch.status]}
              </span>
              <span style={sx("margin-left:auto;font-size:12px;font-weight:800")}>
                <span style={sx("color:#22a06b")}>+{ch.additions}</span>{" "}
                <span style={sx("color:#c0392b")}>−{ch.deletions}</span>
              </span>
            </div>
            <div style={sx("font-family:ui-monospace,Menlo,monospace;font-size:12.5px;line-height:1.6;overflow-x:auto")}>
              {body.map((l, i) => {
                let bg = "transparent";
                let color = "#3f524e";
                if (l.tone === "add") {
                  bg = "#e6f7ee";
                  color = "#12643f";
                } else if (l.tone === "del") {
                  bg = "#fdecec";
                  color = "#a12a1f";
                } else if (l.tone === "section") {
                  bg = "#eef4fb";
                  color = "#4a6fa5";
                }
                return (
                  <div key={i} style={{ ...sx("padding:1px 16px;white-space:pre"), background: bg, color }}>
                    {l.text === "" ? " " : l.text}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
