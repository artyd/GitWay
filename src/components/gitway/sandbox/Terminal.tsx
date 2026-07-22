"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sx } from "@/lib/sx";
import { Icon } from "../ui";
import type { GitEngine } from "@/lib/git-engine/store";
import type { OutLine, Tone } from "@/lib/git-engine/types";
import { complete } from "@/lib/git-engine/complete";
import { useEngineVersion } from "@/lib/git-engine/react/useEngine";
import { HOME } from "@/lib/git-engine/types";

const HIST_PREFIX = "gitway:termhist:v1:";

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

export function Terminal({ engine, account }: { engine: GitEngine; account: string }) {
  useEngineVersion(engine); // ре-рендер при зміні cwd/стану
  const [lines, setLines] = useState<Line[]>(() => [
    { key: 0, text: "GitШлях термінал — пісочниця Git. Введіть `help` для списку команд.", tone: "meta" },
    { key: 1, text: "Спробуйте: git status, ls, git log --oneline, git branch", tone: "hint" },
  ]);
  const [input, setInput] = useState("");
  const seq = useRef(2);
  const history = useRef<string[]>([]);
  const histIdx = useRef<number>(-1);
  const draft = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cwd = engine.cwd();
  const prompt = useMemo(() => `${account}@gitway ${prettyCwd(cwd)} $`, [account, cwd]);

  // Завантажуємо історію команд з localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HIST_PREFIX + account);
      history.current = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      history.current = [];
    }
    histIdx.current = -1;
  }, [account]);

  const persistHistory = useCallback(() => {
    try {
      window.localStorage.setItem(HIST_PREFIX + account, JSON.stringify(history.current.slice(-200)));
    } catch {
      /* ignore */
    }
  }, [account]);

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
      const res = engine.exec(line);
      // спецмаркер очищення
      if (res.lines.length === 1 && res.lines[0].text === "\x00CLEAR") {
        setLines([]);
        return;
      }
      if (res.lines.length) push(res.lines);
    },
    [engine, prompt, push, persistHistory],
  );

  const doComplete = useCallback(() => {
    const el = inputRef.current;
    const cursor = el ? el.selectionStart ?? input.length : input.length;
    const res = complete(input, cursor, engine.workspace());
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
  }, [input, engine, push, prompt]);

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
          <Icon name="fa-solid fa-terminal" /> bash — {prettyCwd(cwd)}
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
