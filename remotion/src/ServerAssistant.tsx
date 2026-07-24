import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  C,
  CLAY,
  TEAL_SHADOW,
  fontFamily,
  useEnter,
  floatY,
  typed,
  typedDone,
  Cursor,
  sceneFade,
  CheckIcon,
  DotCheck,
  TerminalIcon,
  RobotIcon,
  ShieldIcon,
  DownloadIcon,
  PeopleIcon,
  GearIcon,
} from "./common";

const RED = "#e4402a"; // акцент інструкції (стрілки/підказки)
const MONO = "ui-monospace, 'Cascadia Code', 'JetBrains Mono', Consolas, Menlo, monospace";

// ─────────────────────────────────────────────────────────────────────────────
//  ТАЙМЛАЙН СЦЕН (базові тривалості ≈ таймкоди сценарію, 30 fps)
// ─────────────────────────────────────────────────────────────────────────────
type SceneKey =
  | "intro"
  | "desktop"
  | "create"
  | "connect"
  | "cd"
  | "claude"
  | "result"
  | "tips"
  | "trouble"
  | "outro";

const BASE_SCENES: { key: SceneKey; dur: number }[] = [
  { key: "intro", dur: 600 }, // 0:00–0:20
  { key: "desktop", dur: 900 }, // 0:20–0:50
  { key: "create", dur: 1650 }, // 0:50–1:45
  { key: "connect", dur: 1800 }, // 1:45–2:45
  { key: "cd", dur: 1200 }, // 2:45–3:25
  { key: "claude", dur: 2100 }, // 3:25–4:35
  { key: "result", dur: 900 }, // 4:35–5:05
  { key: "tips", dur: 1200 }, // 5:05–5:45
  { key: "trouble", dur: 1650 }, // 5:45–6:40
  { key: "outro", dur: 600 }, // 6:40–7:00
];

export const SERVER_BASE_DURATION = BASE_SCENES.reduce((a, s) => a + s.dur, 0); // ≈ 12600

// Розтягуємо/стискаємо всі сцени під точну довжину озвучки.
function scaledScenes(target?: number): { key: SceneKey; dur: number }[] {
  if (!target || target <= 0) return BASE_SCENES.map((s) => ({ ...s }));
  const k = target / SERVER_BASE_DURATION;
  const scaled = BASE_SCENES.map((s) => ({ key: s.key, dur: Math.max(45, Math.round(s.dur * k)) }));
  const diff = target - scaled.reduce((a, s) => a + s.dur, 0);
  scaled[scaled.length - 1].dur += diff;
  return scaled;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ДРІБНІ ХЕЛПЕРИ
// ─────────────────────────────────────────────────────────────────────────────
const clamp = (extra: object = {}) => ({ extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, ...extra });
// частка кліку 0..1 у вікні [at, at+len]
const pulse = (f: number, at: number, len = 16) => (f >= at && f <= at + len ? (f - at) / len : 0);
// Розтягує базові таймінги сцени так, щоб остання подія (lastAt) припала на frac*dur.
// Дає функцію T(t), яка масштабує будь-який базовий кадр під фактичну довжину сцени.
const fitter = (dur: number, lastAt: number, frac = 0.8) => {
  const k = (dur * frac) / lastAt;
  return (t: number) => Math.round(t * k);
};

// ─────────────────────────────────────────────────────────────────────────────
//  КУРСОР МИШІ (окремий шар)
// ─────────────────────────────────────────────────────────────────────────────
const MouseCursor: React.FC<{ x: number; y: number; click?: number }> = ({ x, y, click = 0 }) => (
  <div style={{ position: "absolute", left: x, top: y, zIndex: 60, pointerEvents: "none", filter: "drop-shadow(0 3px 4px rgba(0,0,0,.35))" }}>
    {click > 0 && (
      <div
        style={{
          position: "absolute",
          left: 2,
          top: 2,
          width: 46,
          height: 46,
          marginLeft: -23,
          marginTop: -23,
          borderRadius: "50%",
          border: `3px solid ${C.teal}`,
          opacity: 1 - click,
          transform: `scale(${0.3 + click * 1.1})`,
        }}
      />
    )}
    <svg width={32} height={32} viewBox="0 0 24 24">
      <path d="M4 2 L4 20 L9 15 L12.4 22 L15 20.8 L11.6 14 L18 14 Z" fill="#fff" stroke="#141414" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  ЧЕРВОНА ПІДКАЗКА-ВИНОСКА
// ─────────────────────────────────────────────────────────────────────────────
const Callout: React.FC<{
  x: number;
  y: number;
  text: string;
  num?: number;
  tail?: "left" | "right" | "down" | "up";
  show: number; // 0..1 поява
}> = ({ x, y, text, num, tail = "down", show }) => {
  const tri: React.CSSProperties = { position: "absolute", width: 0, height: 0 };
  const s = 12;
  if (tail === "down") Object.assign(tri, { bottom: -s + 1, left: 28, borderLeft: `${s}px solid transparent`, borderRight: `${s}px solid transparent`, borderTop: `${s}px solid ${RED}` });
  if (tail === "up") Object.assign(tri, { top: -s + 1, left: 28, borderLeft: `${s}px solid transparent`, borderRight: `${s}px solid transparent`, borderBottom: `${s}px solid ${RED}` });
  if (tail === "left") Object.assign(tri, { left: -s + 1, top: 18, borderTop: `${s}px solid transparent`, borderBottom: `${s}px solid transparent`, borderRight: `${s}px solid ${RED}` });
  if (tail === "right") Object.assign(tri, { right: -s + 1, top: 18, borderTop: `${s}px solid transparent`, borderBottom: `${s}px solid transparent`, borderLeft: `${s}px solid ${RED}` });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 55,
        opacity: show,
        transform: `translateY(${interpolate(show, [0, 1], [10, 0])}px) scale(${interpolate(show, [0, 1], [0.9, 1])})`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: RED,
        color: "#fff",
        padding: "12px 20px",
        borderRadius: 16,
        fontSize: 30,
        fontWeight: 800,
        boxShadow: "0 16px 30px -12px rgba(228,64,42,.7)",
      }}
    >
      {num !== undefined && (
        <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#fff", color: RED, display: "grid", placeItems: "center", fontSize: 26, fontWeight: 900 }}>{num}</span>
      )}
      {text}
      <div style={tri} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  ВІКНО WINDOWS (шапка + тіло)
// ─────────────────────────────────────────────────────────────────────────────
const WinWindow: React.FC<{
  title: string;
  icon?: React.ReactNode;
  w: number;
  h: number;
  children: React.ReactNode;
  bodyBg?: string;
  titleBg?: string;
  titleColor?: string;
  style?: React.CSSProperties;
}> = ({ title, icon, w, h, children, bodyBg = "#ffffff", titleBg = "#f3f4f6", titleColor = "#1f2937", style }) => (
  <div style={{ position: "relative", width: w, height: h, borderRadius: 14, overflow: "hidden", boxShadow: "0 50px 90px -30px rgba(10,30,28,.6), 0 10px 24px -12px rgba(0,0,0,.4)", background: bodyBg, ...style }}>
    <div style={{ height: 46, background: titleBg, display: "flex", alignItems: "center", padding: "0 14px", gap: 10, borderBottom: "1px solid rgba(0,0,0,.08)" }}>
      {icon && <div style={{ width: 22, height: 22, display: "grid", placeItems: "center" }}>{icon}</div>}
      <div style={{ fontSize: 20, fontWeight: 700, color: titleColor, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      <div style={{ display: "flex", gap: 0 }}>
        <span style={{ width: 46, height: 30, display: "grid", placeItems: "center", color: "#5b6169", fontSize: 18 }}>—</span>
        <span style={{ width: 46, height: 30, display: "grid", placeItems: "center", color: "#5b6169", fontSize: 15 }}>▢</span>
        <span style={{ width: 46, height: 30, display: "grid", placeItems: "center", color: "#fff", fontSize: 16, background: "#e5484d" }}>✕</span>
      </div>
    </div>
    <div style={{ position: "relative", width: "100%", height: h - 46 }}>{children}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  ІКОНКИ / ЧІПИ ФАЙЛІВ
// ─────────────────────────────────────────────────────────────────────────────
const DriveIcon: React.FC<{ size?: number }> = ({ size = 54 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect x="14" y="30" width="72" height="40" rx="9" fill="#dfe7ee" stroke="#9fb0c0" strokeWidth={4} />
    <rect x="14" y="52" width="72" height="18" rx="9" fill="#c7d3df" />
    <circle cx="72" cy="61" r="5" fill="#2dd4bf" />
    <rect x="26" y="18" width="48" height="16" rx="5" fill="#b8c6d3" />
  </svg>
);
const PuttyGlyph: React.FC<{ size?: number }> = ({ size = 52 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect x="12" y="16" width="76" height="68" rx="10" fill="#111827" />
    <path d="M26 36 L38 46 L26 56" stroke="#38e07b" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M46 58 h22" stroke="#38e07b" strokeWidth={6} strokeLinecap="round" />
  </svg>
);
const FileChip: React.FC<{ kind: "word" | "excel" | "pdf" | "md"; size?: number }> = ({ kind, size = 64 }) => {
  const map = {
    word: { bg: "#2b579a", label: "W" },
    excel: { bg: "#217346", label: "X" },
    pdf: { bg: "#d93831", label: "PDF" },
    md: { bg: "#0d9488", label: "MD" },
  }[kind];
  return (
    <div style={{ width: size, height: size * 1.25, borderRadius: 8, background: "#fff", boxShadow: "0 8px 16px -8px rgba(0,0,0,.35)", position: "relative", overflow: "hidden", border: "1px solid #e5e7eb" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "62%", background: "#f8fafc" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "42%", background: map.bg, display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: map.label.length > 1 ? size * 0.24 : size * 0.34, letterSpacing: 0.5 }}>{map.label}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  ЗАГОЛОВОК КРОКУ
// ─────────────────────────────────────────────────────────────────────────────
const StepHeader: React.FC<{ step?: string; title: string; color?: string }> = ({ step, title, color = C.teal }) => {
  const e = useEnter(0, 16);
  return (
    <div style={{ position: "absolute", top: 58, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [-18, 0])}px)`, zIndex: 5 }}>
      {step && (
        <div style={{ padding: "8px 22px", borderRadius: 24, background: `${color}22`, color, fontSize: 24, fontWeight: 800, letterSpacing: 1 }}>{step}</div>
      )}
      <div style={{ fontSize: 56, fontWeight: 800, color: C.ink, letterSpacing: -1, textAlign: "center" }}>{title}</div>
    </div>
  );
};

// стрічка з 5 кроків
const STEP_LABELS = ["Створити папку", "Підключитися", "Дати завдання", "Помічник працює", "Забрати результат"];
const StepPill: React.FC<{ i: number; label: string; checked: boolean; delay: number }> = ({ i, label, checked, delay }) => {
  const e = useEnter(delay, 16);
  return (
    <div style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [26, 0])}px) scale(${interpolate(e, [0, 1], [0.9, 1])})`, width: 250, background: C.white, borderRadius: 24, padding: "22px 20px", boxShadow: CLAY, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
      <div style={{ position: "relative", width: 66, height: 66, borderRadius: "50%", background: checked ? C.teal : `${C.teal}18`, display: "grid", placeItems: "center", boxShadow: checked ? TEAL_SHADOW : "none" }}>
        {checked ? <DotCheck /> : <span style={{ fontSize: 32, fontWeight: 900, color: C.teal }}>{i + 1}</span>}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{label}</div>
    </div>
  );
};
const StepStrip: React.FC<{ checked?: boolean; stagger?: boolean }> = ({ checked = false, stagger = true }) => (
  <div style={{ display: "flex", gap: 22, flexWrap: "wrap", justifyContent: "center", maxWidth: 1500 }}>
    {STEP_LABELS.map((lab, i) => (
      <StepPill key={i} i={i} label={lab} checked={checked} delay={stagger ? 10 + i * 12 : 0} />
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  ТЕРМІНАЛ
// ─────────────────────────────────────────────────────────────────────────────
type TLine = { kind: "cmd" | "type" | "out" | "ok" | "sys" | "user" | "prompt"; text: string; at: number };
const Term: React.FC<{ title: string; lines: TLine[]; w?: number; h?: number; showCursorAfter?: number }> = ({ title, lines, w = 1360, h = 640, showCursorAfter }) => {
  const f = useCurrentFrame();
  const enter = useEnter(0, 16);
  return (
    <WinWindow title={title} icon={<PuttyGlyph size={20} />} w={w} h={h} bodyBg="#0b0f0e" titleBg="#0f1513" titleColor="#cbd5cf" style={{ transform: `scale(${interpolate(enter, [0, 1], [0.97, 1])})`, opacity: enter }}>
      <div style={{ padding: "26px 34px", fontFamily: MONO, fontSize: 27, lineHeight: 1.55, color: "#d7efe8", height: "100%", overflow: "hidden" }}>
        {lines.map((ln, i) => {
          if (f < ln.at) return null;
          const isLast = i === lines.length - 1 || f < lines[i + 1].at;
          if (ln.kind === "type") {
            const shown = typed(ln.text, f, ln.at, 24);
            const done = typedDone(ln.text, f, ln.at, 24);
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                <span style={{ color: "#2dd4bf", fontWeight: 700 }}>$ </span>
                <span style={{ color: "#eafaf7" }}>{shown}</span>
                {isLast && !done && <Cursor frame={f} />}
              </div>
            );
          }
          const styleByKind: Record<string, React.CSSProperties> = {
            cmd: { color: "#eafaf7" },
            out: { color: "#9fb6b0" },
            ok: { color: "#5bd6ac", fontWeight: 700 },
            sys: { color: "#7c8f89" },
            user: { color: "#eafaf7" },
            prompt: { color: "#2dd4bf", fontWeight: 700 },
          };
          const prefix = ln.kind === "cmd" ? "$ " : ln.kind === "ok" ? "✓ " : ln.kind === "sys" ? "● " : ln.kind === "user" ? "> " : "";
          const e = interpolate(f, [ln.at, ln.at + 8], [0, 1], clamp());
          return (
            <div key={i} style={{ marginBottom: 8, opacity: e, ...styleByKind[ln.kind] }}>
              {prefix && <span style={{ color: ln.kind === "cmd" ? "#2dd4bf" : ln.kind === "ok" ? "#5bd6ac" : "inherit", fontWeight: 700 }}>{prefix}</span>}
              {ln.text}
              {showCursorAfter !== undefined && isLast && f >= showCursorAfter && <Cursor frame={f} />}
            </div>
          );
        })}
      </div>
    </WinWindow>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  СЦЕНА 0 — ІНТРО
// ═════════════════════════════════════════════════════════════════════════════
const SceneIntro: React.FC = () => {
  const f = useCurrentFrame();
  const badge = useEnter(0, 11);
  const title = useEnter(12);
  const sub = useEnter(22);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30 }}>
      <div style={{ transform: `scale(${badge}) translateY(${floatY(f, 8)}px)`, width: 166, height: 166, borderRadius: 46, background: C.teal, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
        <RobotIcon size={92} />
      </div>
      <div style={{ opacity: title, transform: `translateY(${interpolate(title, [0, 1], [26, 0])}px)`, fontSize: 96, fontWeight: 800, color: C.ink, letterSpacing: -2, textAlign: "center" }}>
        AI-помічник на сервері
      </div>
      <div style={{ opacity: sub, fontSize: 40, fontWeight: 700, color: C.teal }}>5 простих кроків до результату</div>
      <div style={{ marginTop: 22 }}>
        <StepStrip />
      </div>
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  СЦЕНА 1 — РОБОЧИЙ СТІЛ
// ═════════════════════════════════════════════════════════════════════════════
const DesktopIcon: React.FC<{ x: number; y: number; icon: React.ReactNode; label: string; e: number; selected?: number }> = ({ x, y, icon, label, e, selected = 0 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: e }}>
    <div style={{ width: 118, height: 118, borderRadius: 22, background: selected ? "rgba(120,180,255,.28)" : "transparent", border: selected ? "1px solid rgba(150,200,255,.6)" : "1px solid transparent", display: "grid", placeItems: "center" }}>
      <div style={{ width: 92, height: 92, borderRadius: 18, background: "rgba(255,255,255,.1)", display: "grid", placeItems: "center", boxShadow: "0 10px 22px -10px rgba(0,0,0,.5)" }}>{icon}</div>
    </div>
    <div style={{ fontSize: 26, fontWeight: 700, color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,.8)", textAlign: "center", background: selected ? "rgba(120,180,255,.35)" : "transparent", padding: "2px 8px", borderRadius: 6 }}>{label}</div>
  </div>
);
const SceneDesktop: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const T = fitter(dur, 200, 0.9);
  const i1 = useEnter(6, 14);
  const i2 = useEnter(16, 14);
  // курсор: центр → U: → PuTTY
  const cx = interpolate(f, [T(30), T(70), T(150), T(190)], [960, 175, 175, 175], clamp());
  const cy = interpolate(f, [T(30), T(70), T(150), T(190)], [540, 150, 150, 320], clamp());
  const click1 = pulse(f, T(74));
  const click2 = pulse(f, T(194));
  const selU = interpolate(f, [T(72), T(80), T(150), T(158)], [0, 1, 1, 0], clamp());
  const selP = interpolate(f, [T(192), T(200)], [0, 1], clamp());
  const co1 = useEnter(T(50), 16);
  const co2 = useEnter(T(170), 16);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg,#0d2a4a 0%,#123a5c 45%,#0f5a56 100%)" }}>
      {/* легке світло */}
      <div style={{ position: "absolute", top: -140, right: -120, width: 620, height: 620, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,212,191,.18), transparent 70%)" }} />
      <DesktopIcon x={90} y={70} e={i1} icon={<DriveIcon />} label="Диск U:" selected={selU} />
      <DesktopIcon x={90} y={240} e={i2} icon={<PuttyGlyph />} label="PuTTY" selected={selP} />
      <Callout x={250} y={92} text="Ваші файли" tail="left" show={co1} />
      <Callout x={250} y={262} text="Підключення до сервера" tail="left" show={co2} />
      {/* таскбар */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 54, background: "rgba(10,18,30,.85)", display: "flex", alignItems: "center", paddingLeft: 18, gap: 16 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "#2dd4bf", display: "grid", placeItems: "center" }}>
          <TerminalIcon size={20} />
        </div>
        <div style={{ color: "#9fb0c0", fontSize: 20 }}>Робочий стіл</div>
      </div>
      <MouseCursor x={cx} y={cy} click={Math.max(click1, click2)} />
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  ФАЙЛОВИЙ ПРОВІДНИК (переиспользуемый)
// ═════════════════════════════════════════════════════════════════════════════
const Explorer: React.FC<{ crumb: string; children: React.ReactNode; w?: number; h?: number }> = ({ crumb, children, w = 1360, h = 660 }) => {
  const enter = useEnter(0, 16);
  return (
    <WinWindow title={crumb.split("›").pop()!.trim() || "U:"} icon={<DriveIcon size={18} />} w={w} h={h} style={{ transform: `scale(${interpolate(enter, [0, 1], [0.97, 1])})`, opacity: enter }}>
      {/* адресна стрічка */}
      <div style={{ height: 52, background: "#fafafa", borderBottom: "1px solid #eceef0", display: "flex", alignItems: "center", padding: "0 18px", gap: 10 }}>
        <span style={{ color: "#8a939c", fontSize: 22 }}>←</span>
        <span style={{ color: "#c3cbd2", fontSize: 22 }}>→</span>
        <div style={{ flex: 1, height: 34, borderRadius: 8, background: "#fff", border: "1px solid #e2e6ea", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 21, color: "#33404a", gap: 8 }}>
          <DriveIcon size={18} />
          {crumb}
        </div>
      </div>
      <div style={{ display: "flex", height: "calc(100% - 52px)" }}>
        {/* ліва панель */}
        <div style={{ width: 230, background: "#f6f7f8", borderRight: "1px solid #eceef0", padding: "16px 10px", fontSize: 21, color: "#45525c" }}>
          {["Швидкий доступ", "Робочий стіл", "Завантаження", "Документи"].map((t) => (
            <div key={t} style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: "#c7ced4" }} />
              {t}
            </div>
          ))}
          <div style={{ marginTop: 10, padding: "8px 12px", background: "#e8f7f3", borderRadius: 8, color: "#0d7d70", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <DriveIcon size={20} /> Диск U:
          </div>
        </div>
        {/* робоча область */}
        <div style={{ flex: 1, position: "relative", padding: 30 }}>{children}</div>
      </div>
    </WinWindow>
  );
};

const FileTile: React.FC<{ label: string; icon: React.ReactNode; e?: number; highlight?: boolean; style?: React.CSSProperties }> = ({ label, icon, e = 1, highlight, style }) => (
  <div style={{ width: 150, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: e, background: highlight ? "rgba(45,212,191,.16)" : "transparent", borderRadius: 12, padding: "12px 6px", ...style }}>
    <div style={{ height: 84, display: "grid", placeItems: "center" }}>{icon}</div>
    <div style={{ fontSize: 22, fontWeight: 600, color: "#2a343c", textAlign: "center", lineHeight: 1.2 }}>{label}</div>
  </div>
);
const FolderTile: React.FC<{ size?: number }> = ({ size = 74 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path d="M12 30 h24 l8 9 h44 v37 a5 5 0 0 1 -5 5 H17 a5 5 0 0 1 -5 -5 Z" fill="#f2b84b" />
    <path d="M12 30 h24 l8 9 h44 v6 H12 Z" fill="#f6c85f" />
  </svg>
);

const SceneCreate: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const T = fitter(dur, 384, 0.82);
  // фази: показати U: → з'явл. нова папка → набір назви → перетягування файлів
  const folderE = interpolate(f, [T(70), T(90)], [0, 1], clamp());
  const nameShown = typed("звіт-липень", f, T(96), 12);
  const nameTyping = f >= T(96) && !typedDone("звіт-липень", f, T(96), 12);
  // курсор: до порожнього місця (right-click) → до папки
  const cx = interpolate(f, [T(20), T(60), T(240), T(300)], [900, 430, 430, 640], clamp());
  const cy = interpolate(f, [T(20), T(60), T(240), T(300)], [430, 250, 250, 250], clamp());
  const click1 = pulse(f, T(62));
  // файли, що «залітають» у папку
  const files: { kind: "word" | "excel" | "pdf"; label: string; at: number }[] = [
    { kind: "word", label: "звіт.docx", at: T(250) },
    { kind: "excel", label: "дані.xlsx", at: T(300) },
    { kind: "pdf", label: "договір.pdf", at: T(350) },
  ];
  const warn = useEnter(T(120), 16);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <StepHeader step="КРОК 1" title="Створити проект" />
      <div style={{ marginTop: 120, position: "relative" }}>
        <Explorer crumb="Цей ПК › Диск U:">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignContent: "flex-start" }}>
            <FileTile
              e={folderE}
              highlight={f >= T(90)}
              label={f >= T(96) ? (nameShown || " ") : "Нова папка"}
              icon={
                <div style={{ position: "relative" }}>
                  <FolderTile />
                  {nameTyping && <div style={{ position: "absolute", right: -6, bottom: 24 }}><Cursor frame={f} color={C.ink} h={24} /></div>}
                </div>
              }
            />
            {/* файли, що прилітають */}
            {files.map((fl, i) => {
              const fly = interpolate(f, [fl.at, fl.at + 34], [0, 1], clamp());
              const gone = f > fl.at + 40;
              if (gone) return null;
              return (
                <div key={i} style={{ position: "absolute", right: 40, top: 30, opacity: fly, transform: `translate(${interpolate(fly, [0, 1], [0, -360])}px, ${interpolate(fly, [0, 1], [0, 20])}px) scale(${interpolate(fly, [0, 1], [1, 0.5])})` }}>
                  <FileChip kind={fl.kind} size={60} />
                </div>
              );
            })}
          </div>
        </Explorer>
        <MouseCursor x={cx} y={cy} click={click1} />
      </div>
      {/* попередження про назву */}
      <div style={{ position: "absolute", bottom: 60, opacity: warn, transform: `translateY(${interpolate(warn, [0, 1], [20, 0])}px)`, display: "flex", alignItems: "center", gap: 24, background: "#fff5ef", border: `2px solid ${RED}`, borderRadius: 20, padding: "20px 34px", boxShadow: CLAY }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: RED, display: "grid", placeItems: "center", color: "#fff", fontSize: 32, fontWeight: 900 }}>!</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: C.ink }}>
          Без пробілів! Використовуйте дефіс:&nbsp;
          <span style={{ color: "#0d7d70", fontWeight: 800 }}>звіт-липень</span>
          <span style={{ color: RED, textDecoration: "line-through", marginLeft: 16, fontWeight: 700 }}>звіт липень</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  СЦЕНА 3 — PuTTY
// ═════════════════════════════════════════════════════════════════════════════
const PuttyWindow: React.FC = () => {
  const enter = useEnter(0, 16);
  const cats = ["Session", "  Logging", "Terminal", "  Keyboard", "  Bell", "Window", "  Appearance", "Connection", "  Data", "  Proxy", "  SSH"];
  return (
    <WinWindow title="PuTTY Configuration" icon={<PuttyGlyph size={18} />} w={1120} h={620} bodyBg="#eef0f2" style={{ transform: `scale(${interpolate(enter, [0, 1], [0.97, 1])})`, opacity: enter }}>
      <div style={{ display: "flex", height: "100%" }}>
        {/* Category */}
        <div style={{ width: 300, background: "#f7f8f9", borderRight: "1px solid #dfe3e6", padding: "14px 0" }}>
          <div style={{ fontSize: 19, color: "#5b6169", padding: "0 16px 8px", fontWeight: 700 }}>Category:</div>
          {cats.map((c) => (
            <div key={c} style={{ padding: "5px 16px", fontSize: 20, color: c.trim() === "Session" ? "#0b3d91" : "#33404a", fontWeight: c.trim() === "Session" ? 700 : 400, background: c.trim() === "Session" ? "#dbe6fb" : "transparent", whiteSpace: "pre" }}>{c}</div>
          ))}
        </div>
        {/* Right pane */}
        <div style={{ flex: 1, padding: "18px 22px", fontSize: 20, color: "#2a343c" }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Basic options for your PuTTY session</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ width: 150 }}>Host Name (or IP address)</span>
            <div style={{ flex: 1, height: 32, background: "#fff", border: "1px solid #c8ced3", borderRadius: 3 }} />
            <span style={{ width: 44 }}>Port</span>
            <div style={{ width: 70, height: 32, background: "#fff", border: "1px solid #c8ced3", borderRadius: 3, display: "grid", placeItems: "center" }}>22</div>
          </div>
          <div style={{ fontWeight: 600, margin: "8px 0 8px" }}>Load, save or delete a stored session</div>
          <div style={{ marginBottom: 6 }}>Saved Sessions</div>
          <div style={{ height: 34, background: "#fff", border: "1px solid #c8ced3", borderRadius: 3, marginBottom: 10, display: "flex", alignItems: "center", paddingLeft: 10, color: "#0b3d91", fontWeight: 700 }}>AI_VM</div>
          <div style={{ display: "flex", gap: 14 }}>
            {/* list box */}
            <div style={{ flex: 1, height: 190, background: "#fff", border: "1px solid #c8ced3", borderRadius: 3, padding: "6px 0", position: "relative" }}>
              <div style={{ padding: "4px 12px", color: "#33404a" }}>Default Settings</div>
              <div id="ai_vm_row" style={{ padding: "4px 12px", background: "#2b6fe0", color: "#fff", fontWeight: 700 }}>AI_VM</div>
            </div>
            {/* buttons */}
            <div style={{ width: 150, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ height: 40, borderRadius: 4, border: "1px solid #b7bec4", background: "#f0f2f4", display: "grid", placeItems: "center", fontWeight: 700, position: "relative" }}>Load</div>
              <div style={{ height: 40, borderRadius: 4, border: "1px solid #b7bec4", background: "#f0f2f4", display: "grid", placeItems: "center" }}>Save</div>
              <div style={{ height: 40, borderRadius: 4, border: "1px solid #b7bec4", background: "#f0f2f4", display: "grid", placeItems: "center" }}>Delete</div>
            </div>
          </div>
        </div>
      </div>
      {/* bottom bar */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 60, background: "#eef0f2", borderTop: "1px solid #dfe3e6", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, paddingRight: 22 }}>
        <div style={{ width: 130, height: 40, borderRadius: 4, border: "1px solid #b7bec4", background: "#f0f2f4", display: "grid", placeItems: "center", fontWeight: 700 }}>Open</div>
        <div style={{ width: 130, height: 40, borderRadius: 4, border: "1px solid #b7bec4", background: "#f0f2f4", display: "grid", placeItems: "center" }}>Cancel</div>
      </div>
    </WinWindow>
  );
};
const SceneConnect: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const T = fitter(dur, 402, 0.74); // остання дія (клік Open) ≈ 0.74·dur
  // курсор: AI_VM (в списку) → Load → Open
  const cx = interpolate(f, [T(20), T(60), T(150), T(210), T(340), T(400)], [1100, 720, 720, 890, 890, 1120], clamp());
  const cy = interpolate(f, [T(20), T(60), T(150), T(210), T(340), T(400)], [520, 470, 470, 415, 415, 615], clamp());
  const clickVm = pulse(f, T(62));
  const clickLoad = pulse(f, T(212));
  const clickOpen = pulse(f, T(402));
  const co1 = interpolate(f, [T(130), T(150), T(300), T(320)], [0, 1, 1, 0], clamp());
  const co2 = interpolate(f, [T(320), T(342)], [0, 1], clamp());
  // затемнення в термінал — лише наприкінці сцени
  const toBlack = interpolate(f, [dur - 70, dur - 15], [0, 1], clamp());
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <StepHeader step="КРОК 2" title="Підключитися до сервера" color={C.blue} />
      <div style={{ marginTop: 110, position: "relative" }}>
        <PuttyWindow />
        {/* виноски прив'язані до вікна (ширина 1120, старт зверху) */}
        <Callout x={430} y={430} num={1} text="Спочатку Load" tail="right" show={co1} />
        <Callout x={640} y={628} num={2} text="Потім Open" tail="up" show={co2} />
        <MouseCursor x={cx - 168} y={cy - 110} click={Math.max(clickVm, clickLoad, clickOpen)} />
      </div>
      <AbsoluteFill style={{ background: "#0b0f0e", opacity: toBlack, alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#5bd6ac", fontFamily: MONO, fontSize: 30, opacity: toBlack }}>login as: ...</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  СЦЕНА 4 — cd
// ═════════════════════════════════════════════════════════════════════════════
const SceneCd: React.FC<{ dur: number }> = ({ dur }) => {
  const T = fitter(dur, 340, 0.82);
  const lines: TLine[] = [
    { kind: "sys", text: "user@AI_VM:~$", at: T(0) },
    { kind: "type", text: "cd ~/projects/звіт-липень", at: T(12) },
    { kind: "prompt", text: "user@AI_VM:~/projects/звіт-липень$", at: T(150) },
    { kind: "type", text: "ls ~/projects", at: T(175) },
    { kind: "out", text: "звіт-липень   бюджет-Q3   презентація-клієнту", at: T(300) },
    { kind: "sys", text: "user@AI_VM:~/projects/звіт-липень$", at: T(340) },
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <StepHeader step="КРОК 3" title="Перейти у папку проекту" color={C.blue} />
      <div style={{ marginTop: 120 }}>
        <Term title="user@AI_VM: ~ — PuTTY" lines={lines} showCursorAfter={T(360)} />
      </div>
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  СЦЕНА 5 — claude
// ═════════════════════════════════════════════════════════════════════════════
const TaskCard: React.FC<{ text: string; e: number; accent: string }> = ({ text, e, accent }) => (
  <div style={{ opacity: e, transform: `translateX(${interpolate(e, [0, 1], [40, 0])}px)`, background: C.white, borderRadius: 20, padding: "20px 22px", boxShadow: CLAY, borderLeft: `8px solid ${accent}`, width: 430 }}>
    <div style={{ fontSize: 22, color: "#3f524e", fontWeight: 600, lineHeight: 1.4, fontFamily: MONO }}>{text}</div>
  </div>
);
const SceneClaude: React.FC<{ dur: number }> = ({ dur }) => {
  const T = fitter(dur, 500, 0.84);
  const lines: TLine[] = [
    { kind: "type", text: "claude", at: T(10) },
    { kind: "sys", text: "Claude Code — готовий до роботи", at: T(90) },
    { kind: "sys", text: "Опишіть завдання звичайною мовою…", at: T(120) },
    { kind: "user", text: "прочитай файл звіт.docx, зроби коротке", at: T(175) },
    { kind: "user", text: "  резюме основних пунктів і збережи в резюме.md", at: T(205) },
    { kind: "sys", text: "Читаю звіт.docx …", at: T(320) },
    { kind: "sys", text: "Формую резюме …", at: T(380) },
    { kind: "ok", text: "Збережено: резюме.md", at: T(440) },
  ];
  const c1 = useEnter(T(150), 16);
  const c2 = useEnter(T(180), 16);
  const c3 = useEnter(T(210), 16);
  const exit = useEnter(T(470), 16);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <StepHeader step="КРОК 4" title="Запустити помічника і дати завдання" color={C.purple} />
      <div style={{ marginTop: 118, display: "flex", gap: 34, alignItems: "flex-start" }}>
        <Term title="user@AI_VM — Claude Code" lines={lines} w={1180} h={640} showCursorAfter={T(470)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 6 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.purple, letterSpacing: 1 }}>ІНШІ ПРИКЛАДИ</div>
          <TaskCard e={c1} accent={C.teal} text="сконвертуй усі Word-файли в цій папці у PDF" />
          <TaskCard e={c2} accent={C.blue} text="збери дані з цих трьох таблиць Excel в одну зведену" />
          <TaskCard e={c3} accent={C.amber} text="перейменуй усі фото за датою зйомки" />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 54, opacity: exit, display: "flex", alignItems: "center", gap: 14, background: C.white, borderRadius: 16, padding: "14px 26px", boxShadow: CLAY }}>
        <span style={{ fontSize: 26, color: C.muted, fontWeight: 600 }}>Вийти з помічника:</span>
        <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, color: C.ink, background: "#eef4f2", padding: "4px 14px", borderRadius: 8 }}>/exit</span>
        <span style={{ fontSize: 26, color: C.muted }}>або</span>
        <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, color: C.ink, background: "#eef4f2", padding: "4px 14px", borderRadius: 8 }}>Ctrl + C ×2</span>
      </div>
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  СЦЕНА 6 — РЕЗУЛЬТАТ
// ═════════════════════════════════════════════════════════════════════════════
const SceneResult: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const T = fitter(dur, 200, 0.6);
  const appear = interpolate(f, [T(120), T(150)], [0, 1], clamp());
  const flash = interpolate(f, [T(120), T(140), T(175)], [0, 1, 0], clamp());
  const done = useEnter(T(200), 16);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <StepHeader step="КРОК 5" title="Забрати результат" />
      <div style={{ marginTop: 120 }}>
        <Explorer crumb="Цей ПК › Диск U: › звіт-липень">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignContent: "flex-start" }}>
            <FileTile label="звіт.docx" icon={<FileChip kind="word" size={62} />} />
            <FileTile label="дані.xlsx" icon={<FileChip kind="excel" size={62} />} />
            <FileTile label="договір.pdf" icon={<FileChip kind="pdf" size={62} />} />
            <div style={{ position: "relative" }}>
              <FileTile label="резюме.md" icon={<FileChip kind="md" size={62} />} e={appear} highlight={f >= T(130)} />
              <div style={{ position: "absolute", inset: 0, borderRadius: 12, boxShadow: `0 0 0 4px ${C.teal2}`, opacity: flash }} />
            </div>
          </div>
        </Explorer>
      </div>
      <div style={{ position: "absolute", bottom: 60, opacity: done, transform: `translateY(${interpolate(done, [0, 1], [20, 0])}px)`, display: "flex", alignItems: "center", gap: 18, background: C.teal, borderRadius: 20, padding: "18px 34px", boxShadow: TEAL_SHADOW }}>
        <span style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,.22)", display: "grid", placeItems: "center" }}>
          <CheckIcon size={30} />
        </span>
        <span style={{ fontSize: 34, fontWeight: 800, color: "#fff" }}>Готово! Файл вже на диску U:</span>
      </div>
    </AbsoluteFill>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  СЦЕНА 7 — КОРИСНО ЗНАТИ
// ═════════════════════════════════════════════════════════════════════════════
const TipCard: React.FC<{ delay: number; color: string; icon: React.ReactNode; title: string; desc: string }> = ({ delay, color, icon, title, desc }) => {
  const f = useCurrentFrame();
  const e = useEnter(delay, 16);
  return (
    <div style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [40, 0])}px) translateY(${floatY(f, 4, 34, delay) * e}px)`, width: 360, background: C.white, borderRadius: 28, padding: "34px 28px", boxShadow: CLAY, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
      <div style={{ width: 88, height: 88, borderRadius: 24, background: color, display: "grid", placeItems: "center", boxShadow: `0 16px 26px -10px ${color}99` }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: C.ink }}>{title}</div>
      <div style={{ fontSize: 24, color: C.muted, fontWeight: 600, lineHeight: 1.35 }}>{desc}</div>
    </div>
  );
};
const NoDeleteIcon: React.FC = () => (
  <svg width={44} height={44} viewBox="0 0 100 100" fill="none">
    <path d="M18 30 h22 l8 9 h34 v34 a4 4 0 0 1 -4 4 H22 a4 4 0 0 1 -4 -4 Z" fill="#fff" />
    <circle cx="50" cy="52" r="30" fill="none" stroke="#e4402a" strokeWidth={8} />
    <path d="M30 32 L70 72" stroke="#e4402a" strokeWidth={8} strokeLinecap="round" />
  </svg>
);
const SceneTips: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46 }}>
    <StepHeader title="Корисно знати" />
    <div style={{ display: "flex", gap: 28, marginTop: 60, flexWrap: "wrap", justifyContent: "center", maxWidth: 1620 }}>
      <TipCard delay={12} color={C.blue} icon={<DownloadIcon size={44} />} title="exit" desc="Вийти з сервера — команда exit або закрити PuTTY" />
      <TipCard delay={26} color={C.teal} icon={<GearIcon size={44} />} title="tmux → claude" desc="Довге завдання не обірветься при втраті зв'язку" />
      <TipCard delay={40} color={C.amber} icon={<NoDeleteIcon />} title=".claude — не чіпати" desc="Службова папка помічника, потрібна для роботи" />
      <TipCard delay={54} color={C.purple} icon={<ShieldIcon size={44} />} title="Тільки ваш доступ" desc="Колеги у вашу папку зайти не можуть" />
    </div>
  </AbsoluteFill>
);

// ═════════════════════════════════════════════════════════════════════════════
//  СЦЕНА 8 — ЯКЩО ЩОСЬ НЕ ПРАЦЮЄ
// ═════════════════════════════════════════════════════════════════════════════
const TROUBLE: { p: string; s: string }[] = [
  { p: "PuTTY не підключається", s: "Перевірте сесію AI_VM і натисніть Load перед Open" },
  { p: "«no such file or directory»", s: "Помилка в назві папки — наберіть ls ~/projects" },
  { p: "Помічник не бачить файл", s: "Наберіть ls і перевірте, чи ви в потрібній папці" },
  { p: "Нових файлів немає на U:", s: "Оновіть папку клавішею F5" },
  { p: "claude не запускається", s: "Зверніться до системного адміністратора" },
];
const TroubleRow: React.FC<{ p: string; s: string; delay: number; mono: boolean }> = ({ p, s, delay, mono }) => {
  const e = useEnter(delay, 18);
  return (
    <div style={{ opacity: e, transform: `translateX(${interpolate(e, [0, 1], [-30, 0])}px)`, display: "flex", alignItems: "center", padding: "18px 22px", borderTop: "1px solid #eef2f0", gap: 16 }}>
      <div style={{ width: 560, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ flex: "none", width: 40, height: 40, borderRadius: 11, background: "#fff2ee", color: RED, display: "grid", placeItems: "center", fontSize: 24, fontWeight: 900 }}>!</span>
        <span style={{ fontSize: 28, fontWeight: 700, color: C.ink, fontFamily: mono ? MONO : "inherit" }}>{p}</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ flex: "none", width: 34, height: 34, borderRadius: 10, background: C.teal, display: "grid", placeItems: "center" }}>
          <DotCheck />
        </span>
        <span style={{ fontSize: 27, fontWeight: 600, color: "#3f524e" }}>{s}</span>
      </div>
    </div>
  );
};
const SceneTrouble: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <StepHeader title="Якщо щось не працює" color={RED} />
    <div style={{ marginTop: 150, width: 1500, background: C.white, borderRadius: 26, padding: "16px 20px", boxShadow: CLAY, overflow: "hidden" }}>
      <div style={{ display: "flex", padding: "14px 22px", fontSize: 24, fontWeight: 800, color: C.muted, letterSpacing: 0.5 }}>
        <div style={{ width: 560 }}>ПРОБЛЕМА</div>
        <div style={{ flex: 1 }}>РІШЕННЯ</div>
      </div>
      {TROUBLE.map((row, i) => (
        <TroubleRow key={i} p={row.p} s={row.s} delay={20 + i * 20} mono={row.p.includes("«") || row.p.includes("claude") || row.p.includes("PuTTY")} />
      ))}
    </div>
  </AbsoluteFill>
);

// ═════════════════════════════════════════════════════════════════════════════
//  СЦЕНА 9 — ПІДСУМОК
// ═════════════════════════════════════════════════════════════════════════════
const SceneOutro: React.FC = () => {
  const f = useCurrentFrame();
  const badge = useEnter(0, 10);
  const text = useEnter(14);
  const foot = useEnter(30);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
      <div style={{ transform: `scale(${badge}) translateY(${floatY(f, 7)}px)`, width: 156, height: 156, borderRadius: "50%", background: C.teal, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
        <CheckIcon size={88} />
      </div>
      <div style={{ opacity: text, fontSize: 70, fontWeight: 800, color: C.ink }}>{"П'ять простих кроків"}</div>
      <StepStrip checked stagger={false} />
      <div style={{ opacity: foot, marginTop: 10, fontSize: 38, fontWeight: 700, color: C.teal }}>Спробуйте на першому проекті вже сьогодні!</div>
      <div style={{ opacity: foot, display: "flex", alignItems: "center", gap: 14, fontSize: 30, color: C.muted, fontWeight: 600 }}>
        <PeopleIcon size={34} color={C.muted} />
        {"Питання — системний адміністратор завжди на зв'язку"}
      </div>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  РЕНДЕР СЦЕНИ ЗА КЛЮЧЕМ
// ─────────────────────────────────────────────────────────────────────────────
const renderScene = (key: SceneKey, dur: number): React.ReactNode => {
  switch (key) {
    case "intro":
      return <SceneIntro />;
    case "desktop":
      return <SceneDesktop dur={dur} />;
    case "create":
      return <SceneCreate dur={dur} />;
    case "connect":
      return <SceneConnect dur={dur} />;
    case "cd":
      return <SceneCd dur={dur} />;
    case "claude":
      return <SceneClaude dur={dur} />;
    case "result":
      return <SceneResult dur={dur} />;
    case "tips":
      return <SceneTips />;
    case "trouble":
      return <SceneTrouble />;
    case "outro":
      return <SceneOutro />;
  }
};

// плавна поява/зникнення сцени
const FadeWrap: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const { opacity, y } = sceneFade(f, dur);
  return <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)` }}>{children}</AbsoluteFill>;
};

// ═════════════════════════════════════════════════════════════════════════════
//  КОРІННА КОМПОЗИЦІЯ
// ═════════════════════════════════════════════════════════════════════════════
export const ServerAssistant: React.FC<{ audioSrc?: string; audioFrames?: number }> = ({ audioSrc, audioFrames }) => {
  const f = useCurrentFrame();
  const scenes = scaledScenes(audioFrames);
  const total = scenes.reduce((a, s) => a + s.dur, 0);
  // кумулятивні старти сцен (без мутації зовнішньої змінної під час рендеру)
  const starts = scenes.map((_, i) => scenes.slice(0, i).reduce((a, s) => a + s.dur, 0));
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily }}>
      {audioSrc && <Audio src={staticFile(audioSrc)} />}
      {/* м'які фонові плями (крім сцен з власним фоном) */}
      <div style={{ position: "absolute", top: -160, left: -120, width: 620, height: 620, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,212,191,.16), transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -200, right: -160, width: 720, height: 720, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,110,224,.12), transparent 70%)" }} />

      {scenes.map((sc, i) => (
        <Sequence key={i} from={starts[i]} durationInFrames={sc.dur}>
          <FadeWrap dur={sc.dur}>{renderScene(sc.key, sc.dur)}</FadeWrap>
        </Sequence>
      ))}

      {/* бренд + прогрес */}
      <div style={{ position: "absolute", left: 54, bottom: 46, display: "flex", alignItems: "center", gap: 12, opacity: 0.6, zIndex: 70 }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: C.teal, display: "grid", placeItems: "center" }}>
          <TerminalIcon size={20} />
        </div>
        <span style={{ fontSize: 26, fontWeight: 800, color: C.ink }}>GitШлях</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: "rgba(17,74,68,.08)", zIndex: 70 }}>
        <div style={{ height: "100%", width: `${(f / (total - 1)) * 100}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.teal2})` }} />
      </div>
    </AbsoluteFill>
  );
};
