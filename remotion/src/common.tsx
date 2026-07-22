import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Nunito";

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "800"],
  subsets: ["latin", "cyrillic"],
});

export const FPS = 30;

export const C = {
  bg: "#e7ede9",
  teal: "#14b8a6",
  teal2: "#2dd4bf",
  ink: "#14332f",
  muted: "#5b6d68",
  amber: "#f2994a",
  purple: "#7c6ee0",
  blue: "#3aa6c4",
  white: "#ffffff",
};

export const CLAY =
  "0 24px 50px -24px rgba(17,74,68,.32), inset 0 -7px 14px rgba(17,74,68,.05), inset 0 9px 16px rgba(255,255,255,.9)";
export const TEAL_SHADOW =
  "0 24px 40px -14px rgba(20,184,166,.6), inset 0 -7px 14px rgba(6,95,85,.4), inset 0 7px 12px rgba(255,255,255,.35)";

export const PHASES: Record<number, { name: string; sub: string; color: string }> = {
  1: { name: "Основи Git", sub: "ЛОКАЛЬНА РОБОТА", color: C.teal },
  2: { name: "GitHub і команда", sub: "СПІЛЬНА РОБОТА", color: C.blue },
  3: { name: "AI-агенти", sub: "АВТОМАТИЗАЦІЯ", color: C.purple },
  4: { name: "Claude Code CLI", sub: "AI-АГЕНТ У ТЕРМІНАЛІ", color: C.purple },
  5: { name: "OpenAI Codex CLI", sub: "AI-АГЕНТ У ТЕРМІНАЛІ", color: "#d98b3d" },
};

export const useEnter = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
};

export const floatY = (frame: number, amp = 5, speed = 26, phase = 0) => Math.sin(frame / speed + phase) * amp;

// Анімований набір тексту: скільки символів показати на даному кадрі.
export const typed = (text: string, localFrame: number, start: number, cps = 42): string => {
  const n = Math.max(0, Math.floor(((localFrame - start) / FPS) * cps));
  return text.slice(0, Math.min(text.length, n));
};
export const typedDone = (text: string, localFrame: number, start: number, cps = 42): boolean =>
  ((localFrame - start) / FPS) * cps >= text.length;

// Блимаючий курсор терміналу.
export const Cursor: React.FC<{ frame: number; color?: string; h?: number }> = ({ frame, color = "#7ee6d3", h = 34 }) => (
  <span style={{ display: "inline-block", width: 14, height: h, background: color, marginLeft: 4, transform: "translateY(4px)", opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0.15, borderRadius: 2 }} />
);

// Плавний перехід сцени: поява/зникнення за локальним кадром сцени.
export const sceneFade = (localFrame: number, dur: number, inLen = 14, outLen = 12): { opacity: number; y: number } => {
  const opIn = Math.min(1, localFrame / inLen);
  const opOut = Math.min(1, Math.max(0, (dur - localFrame) / outLen));
  const opacity = Math.min(opIn, opOut);
  const y = (1 - opIn) * 26;
  return { opacity, y };
};

// ── додаткові SVG-іконки ──
type IconP = { size?: number; color?: string };
const svg = (size: number, children: React.ReactNode, sw = 8, color = "#fff") => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
export const TerminalIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <><rect x="14" y="20" width="72" height="60" rx="10" /><path d="M28 42 L40 52 L28 62" /><path d="M50 64 h18" /></>, 7, color);
export const RobotIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <><rect x="24" y="34" width="52" height="42" rx="12" /><path d="M50 20 v14 M38 52 h.01 M62 52 h.01" /><path d="M20 50 h4 M76 50 h4" /></>, 7, color);
export const FolderIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <path d="M18 30 h22 l8 10 h34 v34 a4 4 0 0 1 -4 4 H22 a4 4 0 0 1 -4 -4 Z" />, 7, color);
export const ShieldIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <><path d="M50 16 l30 10 v22 c0 20 -14 30 -30 36 c-16 -6 -30 -16 -30 -36 V26 Z" /><path d="M38 50 l8 8 l16 -18" /></>, 7, color);
export const GearIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <><circle cx="50" cy="50" r="14" /><path d="M50 20 v-8 M50 88 v-8 M80 50 h8 M12 50 h8 M71 29 l6 -6 M23 77 l6 -6 M71 71 l6 6 M23 23 l6 6" /></>, 7, color);
export const PlugIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <><path d="M40 20 v16 M60 20 v16" /><rect x="30" y="36" width="40" height="22" rx="8" /><path d="M50 58 v14 a10 10 0 0 1 -10 10 h-4" /></>, 7, color);
export const CloudIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <path d="M34 68 h34 a16 16 0 0 0 2 -32 a22 22 0 0 0 -42 6 a14 14 0 0 0 6 26 Z" />, 7, color);
export const DocIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <><path d="M32 16 h24 l16 16 v48 a4 4 0 0 1 -4 4 H32 a4 4 0 0 1 -4 -4 V20 a4 4 0 0 1 4 -4 Z" /><path d="M40 46 h20 M40 58 h20 M40 70 h12" /></>, 6, color);
export const SparkIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <path d="M50 16 l8 24 l24 8 l-24 8 l-8 24 l-8 -24 l-24 -8 l24 -8 z" fill={color} stroke="none" />, 0, color);
export const PeopleIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <><circle cx="38" cy="38" r="12" /><circle cx="66" cy="42" r="9" /><path d="M18 76 c0 -14 40 -14 40 0 M60 74 c0 -10 24 -12 24 0" /></>, 7, color);
export const KeyboardIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <><rect x="14" y="30" width="72" height="40" rx="8" /><path d="M28 44 h.01 M40 44 h.01 M52 44 h.01 M64 44 h.01 M72 44 h.01 M36 58 h28" /></>, 6, color);
export const DownloadIcon: React.FC<IconP> = ({ size = 42, color = "#fff" }) => svg(size, <><path d="M50 18 v40 M34 46 l16 16 l16 -16" /><path d="M22 74 h56" /></>, 7, color);

// ── SVG-іконки (без емодзі) ──
export const BranchIcon: React.FC<{ size?: number; color?: string }> = ({ size = 60, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <g stroke={color} strokeWidth={9} strokeLinecap="round">
      <circle cx="32" cy="26" r="10" />
      <circle cx="32" cy="74" r="10" />
      <circle cx="68" cy="26" r="10" />
      <path d="M32 36 L32 64" />
      <path d="M32 50 Q32 26 58 26" />
    </g>
  </svg>
);

export const CheckIcon: React.FC<{ size?: number; color?: string }> = ({ size = 90, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round">
    <path d="M26 52 L44 70 L76 32" />
  </svg>
);

export const BulbIcon: React.FC<{ size?: number; color?: string }> = ({ size = 42, color = C.amber }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M38 74 h24 M40 84 h20" />
    <path d="M50 16 a26 26 0 0 1 16 46 c-3 3 -4 6 -4 10 H38 c0 -4 -1 -7 -4 -10 A26 26 0 0 1 50 16 Z" />
  </svg>
);

export const WandIcon: React.FC<{ size?: number; color?: string }> = ({ size = 42, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M30 74 L70 34" />
    <path d="M64 22 l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4 l8 -4 z" fill={color} stroke="none" />
    <circle cx="26" cy="30" r="3" fill={color} stroke="none" />
    <circle cx="78" cy="66" r="3" fill={color} stroke="none" />
  </svg>
);

export const DotCheck: React.FC = () => (
  <svg width={26} height={26} viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round">
    <path d="M24 52 L44 70 L78 30" />
  </svg>
);
