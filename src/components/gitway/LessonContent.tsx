"use client";

import { Fragment } from "react";
import { sx } from "@/lib/sx";
import { Icon } from "./ui";
import type { Lesson } from "@/lib/gitway-data";

/**
 * Багатий блоковий рендер опису CLI-уроку: провідний абзац, теорія блоками з
 * акцентними смугами й підсвіченими командами, і зведення команд уроку.
 * Дані беруться з lesson.sections + lesson.commandQuiz (нічого не вигадуємо).
 */
export function LessonContent({ lesson, accent }: { lesson: Lesson; accent: string }) {
  const paras = (lesson.sections[0]?.body ?? []).filter(Boolean);
  const lead = paras[0] ?? "";
  const rest = paras.slice(1);

  // Команди цього уроку (з квізу): літеральні відповіді + пояснення.
  const cmds = (lesson.commandQuiz ?? [])
    .map((q) => {
      const lit = q.accept.find((a) => a.kind === "literal");
      return lit ? { cmd: lit.value, desc: q.explanation } : null;
    })
    .filter((x): x is { cmd: string; desc: string } => !!x);

  // Для інлайн-підсвітки беремо «конкретні» команди (з пробілом / прапорцем / слешем),
  // щоб не підсвічувати одиничні слова на кшталт «claude» по всьому тексту.
  const inlineCmds = Array.from(new Set(cmds.map((c) => c.cmd)))
    .filter((c) => /\s/.test(c) || c.startsWith("/") || c.includes("-"))
    .sort((a, b) => b.length - a.length);

  return (
    <div style={sx("display:flex;flex-direction:column;gap:18px;margin-bottom:22px")}>
      {/* провідний абзац */}
      {lead && (
        <div style={sx(`display:flex;gap:16px;padding:22px 24px;border-radius:24px;background:#fff;box-shadow:0 14px 32px -18px rgba(17,74,68,.3),inset 0 -5px 11px rgba(17,74,68,.045),inset 0 6px 11px rgba(255,255,255,.9);border-left:5px solid ${accent}`)}>
          <span style={sx(`flex:none;display:grid;place-items:center;width:50px;height:50px;border-radius:16px;background:${accent}1a;color:${accent};font-size:22px`)}>
            <Icon name="fa-solid fa-circle-info" />
          </span>
          <div>
            <div style={sx(`display:inline-block;font-size:12px;font-weight:800;color:${accent};letter-spacing:.5px;margin-bottom:6px`)}>ПРО ЩО УРОК</div>
            <p style={sx("margin:0;font-size:16.5px;line-height:1.6;color:#3f524e;text-wrap:pretty")}>{highlight(lead, inlineCmds, accent)}</p>
          </div>
        </div>
      )}

      {/* теорія блоками */}
      {rest.length > 0 && (
        <div style={sx("border-radius:26px;background:#fff;padding:20px 22px;box-shadow:0 16px 36px -22px rgba(17,74,68,.3),inset 0 -5px 11px rgba(17,74,68,.045),inset 0 6px 11px rgba(255,255,255,.9)")}>
          {rest.map((p, i) => (
            <div
              key={i}
              style={sx(
                `display:flex;gap:14px;padding:14px 8px;${i > 0 ? "border-top:1px solid #eef3f1;" : ""}`,
              )}
            >
              <span style={sx(`flex:none;margin-top:7px;width:9px;height:9px;border-radius:3px;background:${accent}`)} />
              <p style={sx("margin:0;font-size:15.5px;line-height:1.65;color:#3f524e;text-wrap:pretty")}>{highlight(p, inlineCmds, accent)}</p>
            </div>
          ))}
        </div>
      )}

      {/* команди цього уроку */}
      {cmds.length > 0 && (
        <div style={sx("border-radius:26px;background:#0f2a27;padding:22px 24px;box-shadow:0 20px 44px -22px rgba(17,74,68,.4)")}>
          <div style={sx("display:flex;align-items:center;gap:10px;margin-bottom:14px")}>
            <Icon name="fa-solid fa-terminal" style={sx("color:#2dd4bf;font-size:18px")} />
            <span style={sx("font-weight:800;font-size:15px;color:#eafaf7")}>Команди цього уроку</span>
          </div>
          <div style={sx("display:flex;flex-direction:column;gap:12px")}>
            {cmds.map((c, i) => (
              <div key={i} style={sx("display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap")}>
                <code style={sx("flex:none;font-family:ui-monospace,Menlo,monospace;font-size:14px;font-weight:700;color:#7ee6d3;background:#123531;border-radius:10px;padding:7px 12px;box-shadow:inset 0 2px 6px rgba(0,0,0,.3)")}>
                  $ {c.cmd}
                </code>
                <span style={sx("flex:1;min-width:200px;font-size:14px;color:#9fd8cd;line-height:1.5;padding-top:6px")}>{c.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Підсвічує входження команд у тексті як інлайн-код-чипи. */
function highlight(text: string, cmds: string[], accent: string) {
  if (!cmds.length) return text;
  const escaped = cmds.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp("(" + escaped.join("|") + ")", "gi");
  const parts = text.split(re);
  const lower = new Set(cmds.map((c) => c.toLowerCase()));
  return parts.map((part, i) =>
    lower.has(part.toLowerCase()) ? (
      <code
        key={i}
        style={sx(
          `font-family:ui-monospace,Menlo,monospace;font-size:13.5px;font-weight:700;color:${accent};background:${accent}14;border-radius:7px;padding:1px 7px;white-space:nowrap`,
        )}
      >
        {part}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
