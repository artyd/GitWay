"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sx } from "@/lib/sx";
import { Icon } from "../ui";
import type { OutLine, Tone } from "@/lib/git-engine/types";
import type { Completion } from "@/lib/git-engine/complete";
import type { TerminalBackend } from "@/lib/terminal/backend";
import { useBackendVersion } from "@/lib/terminal/backend";
import { HOME } from "@/lib/git-engine/types";

const HIST_PREFIX = "gitway:termhist:v1:";

const DEFAULT_SEED: OutLine[] = [
  { text: "GitШлях термінал — пісочниця Git. Введіть `help` для списку команд.", tone: "meta" },
  { text: "Спробуйте: git status, ls, git log --oneline, git branch", tone: "hint" },
];

type CompleteFn = (line: string, cursor: number) => Completion;

const toneColor: Record<Tone, string> = {
  out: "#c7f0e8",
  cmd: "#7ee6d3",
  err: "#ff9b8a",
  add: "#7ee6a0",
  del: "#ff9b8a",
  meta: "#9fd8cd",
  section: "#8fb8ff",
  hint: "#8ba39d",
  branch: "#c3a6ff",
  warn: "#f2c94c",
};

function prettyCwd(cwd: string): string {
  if (cwd === HOME) return "~";
  if (cwd.startsWith(HOME + "/")) return "~" + cwd.slice(HOME.length);
  return cwd;
}

type Line = OutLine & { key: number };

export type TerminalProps = {
  backend: TerminalBackend;
  account: string;
  seedLines?: OutLine[];
  promptFor?: (cwd: string) => string;
  titleFor?: (cwd: string) => string;
  complete?: CompleteFn;
  historyKey?: string;
};

export function Terminal({
  backend,
  account,
  seedLines,
  promptFor,
  titleFor,
  complete: completeFn,
  historyKey,
}: TerminalProps) {
  useBackendVersion(backend); // ре-рендер при зміні cwd/стану
  const seed = seedLines ?? DEFAULT_SEED;
  const [lines, setLines] = useState<Line[]>(() => seed.map((l, i) => ({ ...l, key: i })));
  const [input, setInput] = useState("");
  const seq = useRef(seed.length);
  const history = useRef<string[]>([]);
  const histIdx = useRef<number>(-1);
  const draft = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const histBucket = historyKey ?? account;
  const cwd = backend.cwd();
  const prompt = promptFor ? promptFor(cwd) : `${account}@gitway ${prettyCwd(cwd)} $`;
  const title = titleFor ? titleFor(cwd) : `bash — ${prettyCwd(cwd)}`;

  // Завантажуємо історію команд з localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HIST_PREFIX + histBucket);
      history.current = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      history.current = [];
    }
    histIdx.current = -1;
  }, [histBucket]);

  const persistHistory = useCallback(() => {
    try {
      window.localStorage.setItem(HIST_PREFIX + histBucket, JSON.stringify(history.current.slice(-200)));
    } catch {
      /* ignore */
    }
  }, [histBucket]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const push = useCallback((newLines: OutLine[]) => {
    setLines((prev) => {
      const start = seq.current;
      seq.current += newLines.length;
      return prev.concat(newLines.map((l, i) => ({ ...l, key: start + i })));
    });
  }, []);

  const runLine = useCallback(
    (raw: string) => {
      const line = raw;
      push([{ text: prompt + " " + line, tone: "cmd" }]);
      if (line.trim()) {
        history.current.push(line);
        persistHistory();
      }
      histIdx.current = -1;
      const res = backend.exec(line);
      // спецмаркер очищення
      if (res.lines.length === 1 && res.lines[0].text === "\x00CLEAR") {
        setLines([]);
        return;
      }
      if (res.lines.length) push(res.lines);
    },
    [backend, prompt, push, persistHistory],
  );

  const doComplete = useCallback(() => {
    if (!completeFn) return;
    const el = inputRef.current;
    const cursor = el ? el.selectionStart ?? input.length : input.length;
    const res = completeFn(input, cursor);
    if (!res.candidates.length) return;
    if (res.candidates.length === 1 || res.commonPrefix.length > (cursor - res.replaceFrom)) {
      const before = input.slice(0, res.replaceFrom);
      const after = input.slice(cursor);
      const fill = res.candidates.length === 1 ? res.candidates[0] : res.commonPrefix;
      const next = before + fill + after;
      setInput(next);
      requestAnimationFrame(() => {
        const pos = (before + fill).length;
        if (inputRef.current) inputRef.current.setSelectionRange(pos, pos);
      });
    } else {
      // кілька варіантів — показуємо їх
      push([{ text: prompt + " " + input, tone: "cmd" }, { text: res.candidates.join("   "), tone: "hint" }]);
    }
  }, [input, completeFn, push, prompt]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const raw = input;
      setInput("");
      runLine(raw);
    } else if (e.key === "Tab") {
      e.preventDefault();
      doComplete();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.current.length) return;
      if (histIdx.current === -1) {
        draft.current = input;
        histIdx.current = history.current.length - 1;
      } else if (histIdx.current > 0) {
        histIdx.current--;
      }
      setInput(history.current[histIdx.current] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx.current === -1) return;
      if (histIdx.current < history.current.length - 1) {
        histIdx.current++;
        setInput(history.current[histIdx.current] ?? "");
      } else {
        histIdx.current = -1;
        setInput(draft.current);
      }
    } else if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      push([{ text: prompt + " " + input + "^C", tone: "cmd" }]);
      setInput("");
      histIdx.current = -1;
    } else if (e.ctrlKey && (e.key === "l" || e.key === "L")) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div style={sx("display:flex;flex-direction:column;height:100%;min-height:0")}>
      <div style={sx("display:flex;align-items:center;gap:8px;padding:12px 16px;background:#0b201d;border-radius:16px 16px 0 0")}>
        <span style={sx("width:12px;height:12px;border-radius:50%;background:#ff5f57")} />
        <span style={sx("width:12px;height:12px;border-radius:50%;background:#febc2e")} />
        <span style={sx("width:12px;height:12px;border-radius:50%;background:#28c840")} />
        <span style={sx("margin-left:8px;color:#6f9089;font-size:12.5px;font-weight:700")}>
          <Icon name="fa-solid fa-terminal" /> {title}
        </span>
      </div>
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        style={sx(
          "flex:1;min-height:280px;overflow-y:auto;font-family:'SF Mono',ui-monospace,Menlo,monospace;background:#0f2a27;padding:16px 18px;font-size:13.5px;line-height:1.65;cursor:text;box-shadow:inset 0 3px 14px rgba(0,0,0,.35)",
        )}
      >
        {lines.map((l) => (
          <div key={l.key} style={{ whiteSpace: "pre-wrap", color: toneColor[l.tone ?? "out"], wordBreak: "break-word" }}>
            {l.text === "" ? " " : l.text}
          </div>
        ))}
        <div style={sx("display:flex;align-items:center;gap:8px;margin-top:2px")}>
          <span style={sx("color:#2dd4bf;font-weight:700;flex:none")}>{prompt}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Командний рядок терміналу"
            style={sx("flex:1;background:none;border:none;color:#eafaf7;font-family:inherit;font-size:13.5px;outline:none;padding:0")}
          />
        </div>
      </div>
      <div style={sx("display:flex;flex-wrap:wrap;gap:12px;padding:9px 16px;background:#0b201d;border-radius:0 0 16px 16px;color:#6f9089;font-size:11.5px;font-weight:700")}>
        <span><b style={{ color: "#9fd8cd" }}>Tab</b> — доповнення</span>
        <span><b style={{ color: "#9fd8cd" }}>↑/↓</b> — історія</span>
        <span><b style={{ color: "#9fd8cd" }}>Ctrl+L</b> — очистити</span>
        <span><b style={{ color: "#9fd8cd" }}>Ctrl+C</b> — скасувати</span>
      </div>
    </div>
  );
}
