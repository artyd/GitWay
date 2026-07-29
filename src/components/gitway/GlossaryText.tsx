"use client";

import { Fragment, useId, useState, type ReactNode } from "react";
import { sx } from "@/lib/sx";
import { findTermMatches, type GlossaryEntry } from "@/lib/content/glossary";

/**
 * Підсвічування «складних слів» у тексті уроку з підказкою простою мовою.
 *
 * - `<GlossaryText>` рендерить рядок, обгортаючи знайдені терміни у <Term>.
 * - `renderRich()` додатково вміє підсвічувати команди (інлайн-код-чипи),
 *   не даючи їм перетинатися з термінами (команди мають пріоритет).
 *
 * Терміни й пояснення живуть у `src/lib/content/glossary.ts`.
 */

type Seg =
  | { kind: "text"; text: string }
  | { kind: "term"; text: string; entry: GlossaryEntry }
  | { kind: "cmd"; text: string };

/** Розбиває текст на сегменти: команди (пріоритет) + терміни глосарію + звичайний текст. */
function segment(text: string, cmds: string[]): Seg[] {
  type Hit = { start: number; end: number; kind: "term" | "cmd"; entry?: GlossaryEntry };
  const hits: Hit[] = [];

  // Команди — з переданого списку (літерали з квізу уроку).
  if (cmds.length) {
    const escaped = cmds
      .slice()
      .sort((a, b) => b.length - a.length)
      .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp("(" + escaped.join("|") + ")", "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      hits.push({ start: m.index, end: m.index + m[0].length, kind: "cmd" });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  // Терміни глосарію (перше входження кожного).
  for (const t of findTermMatches(text)) {
    hits.push({ start: t.start, end: t.end, kind: "term", entry: t.entry });
  }

  // Сортуємо; викидаємо ті, що перетинаються з уже прийнятими (команди раніше за рахунок пріоритету).
  hits.sort((a, b) => a.start - b.start || (a.kind === "cmd" ? -1 : 1));
  const chosen: Hit[] = [];
  let guard = -1;
  for (const h of hits) {
    if (h.start < guard) continue;
    chosen.push(h);
    guard = h.end;
  }

  const segs: Seg[] = [];
  let pos = 0;
  for (const h of chosen) {
    if (h.start > pos) segs.push({ kind: "text", text: text.slice(pos, h.start) });
    const slice = text.slice(h.start, h.end);
    if (h.kind === "cmd") segs.push({ kind: "cmd", text: slice });
    else segs.push({ kind: "term", text: slice, entry: h.entry! });
    pos = h.end;
  }
  if (pos < text.length) segs.push({ kind: "text", text: text.slice(pos) });
  return segs;
}

/** Рендер тексту з термінами (і, опційно, командами). */
export function renderRich(text: string, opts: { cmds?: string[]; accent?: string } = {}): ReactNode {
  const accent = opts.accent ?? "#0f9c8c";
  const cmds = opts.cmds ?? [];
  const segs = segment(text, cmds);
  if (segs.length === 1 && segs[0].kind === "text") return text;
  return segs.map((s, i) => {
    if (s.kind === "text") return <Fragment key={i}>{s.text}</Fragment>;
    if (s.kind === "cmd")
      return (
        <code
          key={i}
          style={sx(
            `font-family:ui-monospace,Menlo,monospace;font-size:13.5px;font-weight:700;color:${accent};background:${accent}14;border-radius:7px;padding:1px 7px;white-space:nowrap`,
          )}
        >
          {s.text}
        </code>
      );
    return <Term key={i} label={s.text} entry={s.entry} accent={accent} />;
  });
}

export function GlossaryText({ text, accent }: { text: string; accent?: string }) {
  return <>{renderRich(text, { accent })}</>;
}

/** Терм-чип з підказкою: показується при наведенні, фокусі або тапі. */
export function Term({ label, entry, accent }: { label: string; entry: GlossaryEntry; accent: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      style={sx("position:relative;display:inline-block")}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        style={sx(
          `appearance:none;border:none;padding:0 1px;margin:0;cursor:help;font:inherit;color:${accent};font-weight:700;background:transparent;border-bottom:1.5px dotted ${accent}99;line-height:1.2;transition:background .15s`,
        )}
      >
        {label}
        <span style={sx(`display:inline-block;margin-left:3px;font-size:.72em;vertical-align:super;color:${accent};font-weight:800`)}>?</span>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          style={sx(
            `position:absolute;z-index:50;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);width:max-content;max-width:min(300px,80vw);padding:12px 14px;border-radius:16px;background:#0f2a27;color:#eafaf7;font-size:13.5px;font-weight:500;line-height:1.5;text-align:left;white-space:normal;box-shadow:0 18px 40px -14px rgba(6,40,36,.7),inset 0 1px 0 rgba(255,255,255,.06);pointer-events:none`,
          )}
        >
          <span style={sx(`display:block;font-weight:800;font-size:12.5px;letter-spacing:.2px;margin-bottom:5px;color:${accent === "#0f2a27" ? "#7ee6d3" : "#5eead4"}`)}>
            {entry.term}
          </span>
          {entry.def}
          <span
            style={sx(
              "position:absolute;top:100%;left:50%;transform:translateX(-50%);border:7px solid transparent;border-top-color:#0f2a27",
            )}
          />
        </span>
      )}
    </span>
  );
}
