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
