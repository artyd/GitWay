import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Nunito";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "800"],
  subsets: ["latin", "cyrillic"],
});

export const FPS = 30;
// Тривалість підігнана під озвучку (≈101.5 c).
const SCENES = { intro: 255, analogy: 540, why: 480, concepts: 660, commit: 615, outro: 495 };
export const LESSON1_DURATION =
  SCENES.intro + SCENES.analogy + SCENES.why + SCENES.concepts + SCENES.commit + SCENES.outro; // 3045

const C = {
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
const CLAY =
  "0 24px 50px -24px rgba(17,74,68,.32), inset 0 -7px 14px rgba(17,74,68,.05), inset 0 9px 16px rgba(255,255,255,.9)";
const TEAL_SHADOW =
  "0 24px 40px -14px rgba(20,184,166,.6), inset 0 -7px 14px rgba(6,95,85,.4), inset 0 7px 12px rgba(255,255,255,.35)";

const useEnter = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
};
// плавне «дихання» для довгих кадрів, щоб не було статики
const floatY = (frame: number, amp = 5, speed = 26, phase = 0) => Math.sin(frame / speed + phase) * amp;

// ── SVG-іконки (без емодзі — за рекомендацією ui-ux-pro-max) ──
const BranchIcon: React.FC<{ size?: number; color?: string }> = ({ size = 60, color = "#fff" }) => (
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
const FolderIcon: React.FC = () => (
  <svg width={46} height={46} viewBox="0 0 100 100" fill="#fff">
    <path d="M12 26c0-4 3-7 7-7h20l8 9h34c4 0 7 3 7 7v37c0 4-3 7-7 7H19c-4 0-7-3-7-7V26z" />
  </svg>
);
const CommitIcon: React.FC = () => (
  <svg width={46} height={46} viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round">
    <line x1="14" y1="50" x2="34" y2="50" />
    <line x1="66" y1="50" x2="86" y2="50" />
    <circle cx="50" cy="50" r="16" fill="#fff" stroke="none" />
  </svg>
);
const GitBranchGlyph: React.FC = () => (
  <svg width={46} height={46} viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round">
    <circle cx="30" cy="24" r="9" fill="#fff" stroke="none" />
    <circle cx="30" cy="76" r="9" fill="#fff" stroke="none" />
    <circle cx="70" cy="30" r="9" fill="#fff" stroke="none" />
    <path d="M30 33 L30 67" />
    <path d="M30 52 Q30 30 61 30" />
  </svg>
);
const RewindIcon: React.FC<{ color?: string }> = ({ color = C.teal }) => (
  <svg width={54} height={54} viewBox="0 0 100 100" fill={color}>
    <path d="M50 28 L26 50 L50 72 Z" />
    <path d="M76 28 L52 50 L76 72 Z" />
  </svg>
);
const CheckIcon: React.FC<{ size?: number; color?: string }> = ({ size = 90, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round">
    <path d="M26 52 L44 70 L76 32" />
  </svg>
);
const DotCheck: React.FC = () => (
  <svg width={30} height={30} viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round">
    <path d="M24 52 L44 70 L78 30" />
  </svg>
);

// ============ SCENE 1 — INTRO ============
const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const badge = useEnter(0, 12);
  const title = useEnter(10);
  const pill = useEnter(22);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
      <div
        style={{
          transform: `scale(${badge}) translateY(${floatY(frame, 8)}px)`,
          width: 168,
          height: 168,
          borderRadius: 52,
          background: C.teal,
          display: "grid",
          placeItems: "center",
          boxShadow: TEAL_SHADOW,
        }}
      >
        <BranchIcon size={92} />
      </div>
      <div style={{ opacity: pill, transform: `translateY(${interpolate(pill, [0, 1], [14, 0])}px)`, padding: "10px 26px", borderRadius: 30, background: "#d8f3ee", color: "#0d7d70", fontWeight: 800, fontSize: 30, letterSpacing: 1 }}>
        УРОК 1 · ОСНОВИ GIT
      </div>
      <div style={{ opacity: title, transform: `translateY(${interpolate(title, [0, 1], [30, 0])}px)`, fontSize: 116, fontWeight: 800, color: C.ink, letterSpacing: -2 }}>
        Що таке Git?
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 2 — ANALOGY ============
const Analogy: React.FC = () => {
  const frame = useCurrentFrame();
  const card = useEnter(0, 16);
  const text = useEnter(14);
  const angle = interpolate(frame, [24, 470], [40, -680], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ transform: `scale(${card}) translateY(${floatY(frame, 6, 34)}px)`, width: 260, height: 260, borderRadius: "50%", background: C.white, display: "grid", placeItems: "center", boxShadow: CLAY, position: "relative" }}>
        <svg width={210} height={210} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#e4ebe8" strokeWidth="6" />
          {[...Array(12)].map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={50 + Math.sin(a) * 37} cy={50 - Math.cos(a) * 37} r={2.4} fill="#b7c7c2" />;
          })}
          <line x1="50" y1="50" x2={50 + Math.sin((angle * Math.PI) / 180) * 30} y2={50 - Math.cos((angle * Math.PI) / 180) * 30} stroke={C.teal} strokeWidth="5" strokeLinecap="round" />
          <circle cx="50" cy="50" r="5" fill={C.teal} />
        </svg>
        <div style={{ position: "absolute", bottom: -6, right: -6, width: 78, height: 78, borderRadius: "50%", background: "#fef3e6", display: "grid", placeItems: "center", boxShadow: "0 10px 20px -10px rgba(242,153,74,.6)" }}>
          <RewindIcon color={C.amber} />
        </div>
      </div>
      <div style={{ maxWidth: 1200, textAlign: "center", opacity: text }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: C.amber, letterSpacing: 1, marginBottom: 14 }}>АНАЛОГІЯ</div>
        <div style={{ fontSize: 62, fontWeight: 800, color: C.ink, lineHeight: 1.2 }}>
          Git — це <span style={{ color: C.teal }}>машина часу</span> для твоїх файлів
        </div>
        <div style={{ fontSize: 34, color: C.muted, fontWeight: 600, marginTop: 20 }}>
          Помилився? Просто перемотуєш назад — і все на місці.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 3 — WHY (навіщо керівнику) ============
const ArchiveGlyph: React.FC = () => (
  <svg width={38} height={38} viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="18" y="26" width="64" height="18" rx="5" />
    <path d="M24 44 v30 a5 5 0 0 0 5 5 h42 a5 5 0 0 0 5 -5 V44" />
    <line x1="42" y1="58" x2="58" y2="58" />
  </svg>
);
const HistoryGlyph: React.FC = () => (
  <svg width={38} height={38} viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M50 22 a28 28 0 1 1 -26 18" />
    <path d="M24 24 v16 h16" />
    <path d="M50 38 v14 l10 8" />
  </svg>
);
const ChecklistGlyph: React.FC = () => (
  <svg width={38} height={38} viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 32 l7 7 l12 -12" />
    <path d="M22 66 l7 7 l12 -12" />
    <line x1="54" y1="32" x2="82" y2="32" />
    <line x1="54" y1="66" x2="82" y2="66" />
  </svg>
);
const WhyRow: React.FC<{ delay: number; icon: React.ReactNode; text: string; color: string }> = ({ delay, icon, text, color }) => {
  const e = useEnter(delay, 18);
  return (
    <div style={{ opacity: e, transform: `translateX(${interpolate(e, [0, 1], [-30, 0])}px)`, display: "flex", alignItems: "center", gap: 26, background: C.white, borderRadius: 26, padding: "26px 34px", boxShadow: CLAY, width: 1080 }}>
      <div style={{ flex: "none", width: 74, height: 74, borderRadius: 22, background: color, display: "grid", placeItems: "center", boxShadow: `0 14px 24px -10px ${color}99` }}>
        {icon}
      </div>
      <div style={{ fontSize: 38, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{text}</div>
    </div>
  );
};
const Why: React.FC = () => {
  const t = useEnter(0);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
      <div style={{ opacity: t, fontSize: 58, fontWeight: 800, color: C.ink, marginBottom: 6 }}>Навіщо це керівнику</div>
      <WhyRow delay={24} color={C.teal} icon={<ArchiveGlyph />} text="Проєкт відділу живе в Git-репозиторії" />
      <WhyRow delay={110} color={C.blue} icon={<HistoryGlyph />} text="Бачиш історію: що і коли змінилось" />
      <WhyRow delay={196} color={C.purple} icon={<ChecklistGlyph />} text="Ставиш чіткі задачі команді та AI-агентам" />
    </AbsoluteFill>
  );
};

// ============ SCENE 4 — CONCEPTS ============
const ConceptCard: React.FC<{ delay: number; color: string; icon: React.ReactNode; title: string; desc: string; phase: number }> = ({ delay, color, icon, title, desc, phase }) => {
  const frame = useCurrentFrame();
  const e = useEnter(delay, 16);
  const settled = interpolate(e, [0.6, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ transform: `translateY(${interpolate(e, [0, 1], [60, 0])}px) translateY(${floatY(frame, 5, 30, phase) * settled}px) scale(${interpolate(e, [0, 1], [0.9, 1])})`, opacity: e, width: 360, background: C.white, borderRadius: 34, padding: "40px 32px", boxShadow: CLAY, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18 }}>
      <div style={{ width: 96, height: 96, borderRadius: 28, background: color, display: "grid", placeItems: "center", boxShadow: `0 16px 26px -10px ${color}99, inset 0 -5px 10px rgba(0,0,0,.15), inset 0 5px 9px rgba(255,255,255,.3)` }}>{icon}</div>
      <div style={{ fontSize: 40, fontWeight: 800, color: C.ink }}>{title}</div>
      <div style={{ fontSize: 26, color: C.muted, fontWeight: 600, lineHeight: 1.35 }}>{desc}</div>
    </div>
  );
};
const Concepts: React.FC = () => {
  const t = useEnter(0);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 56 }}>
      <div style={{ opacity: t, transform: `translateY(${interpolate(t, [0, 1], [-20, 0])}px)`, fontSize: 64, fontWeight: 800, color: C.ink }}>Три головні слова</div>
      <div style={{ display: "flex", gap: 34 }}>
        <ConceptCard delay={14} phase={0} color={C.teal} icon={<FolderIcon />} title="Репозиторій" desc="Проєкт цілком, з усією історією змін" />
        <ConceptCard delay={30} phase={2} color={C.blue} icon={<CommitIcon />} title="Коміт" desc="Один «знімок» змін з коротким описом" />
        <ConceptCard delay={46} phase={4} color={C.purple} icon={<GitBranchGlyph />} title="Гілка" desc="Паралельна версія — пробуй, не чіпаючи основну" />
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 5 — COMMIT FLOW ============
const TermLine: React.FC<{ delay: number; cmd: string; out: string }> = ({ delay, cmd, out }) => {
  const e = useEnter(delay, 18);
  const outE = useEnter(delay + 22, 18);
  return (
    <div style={{ opacity: e, transform: `translateX(${interpolate(e, [0, 1], [-24, 0])}px)`, marginBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40, fontWeight: 700 }}>
        <span style={{ color: C.teal2 }}>$</span>
        <span style={{ color: "#eafaf7" }}>{cmd}</span>
      </div>
      <div style={{ opacity: outE, display: "flex", alignItems: "center", gap: 14, marginTop: 12, paddingLeft: 40, fontSize: 30 }}>
        <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, background: C.teal }}>
          <DotCheck />
        </span>
        <span style={{ color: "#9fd8cd" }}>{out}</span>
      </div>
    </div>
  );
};
const CommitFlow: React.FC = () => {
  const t = useEnter(0);
  const card = useEnter(6, 18);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46 }}>
      <div style={{ opacity: t, fontSize: 60, fontWeight: 800, color: C.ink }}>Один коміт — крок за кроком</div>
      <div style={{ transform: `scale(${interpolate(card, [0, 1], [0.95, 1])})`, opacity: card, width: 1160, background: "#0f2a27", borderRadius: 30, padding: "48px 56px", fontFamily: "ui-monospace, Menlo, monospace", boxShadow: "0 40px 80px -30px rgba(17,74,68,.55), inset 0 3px 16px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 34 }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#febc2e" }} />
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#28c840" }} />
        </div>
        <TermLine delay={30} cmd="Змінити файл README.md" out="Git побачив різницю" />
        <TermLine delay={170} cmd="git add ." out="зміну підготовлено до збереження" />
        <TermLine delay={310} cmd='git commit -m "оновив опис"' out="новий запис у історії проєкту" />
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 6 — OUTRO ============
const Spark: React.FC<{ x: number; y: number; c: string; d: number; i: number }> = ({ x, y, c, d, i }) => {
  const frame = useCurrentFrame();
  const e = useEnter(d, 12);
  return (
    <div style={{ position: "absolute", transform: `translate(${x}px, ${y + floatY(frame, 10, 22, i)}px) scale(${e})`, width: 26, height: 26, borderRadius: 9, background: c, opacity: 0.85 }} />
  );
};
const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const badge = useEnter(0, 10);
  const text = useEnter(12);
  const foot = useEnter(24);
  const sparks = [
    { x: -220, y: -120, c: C.amber, d: 8 },
    { x: 230, y: -90, c: C.teal, d: 16 },
    { x: -180, y: 130, c: C.purple, d: 24 },
    { x: 210, y: 140, c: C.blue, d: 32 },
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36 }}>
      {sparks.map((s, i) => (
        <Spark key={i} x={s.x} y={s.y} c={s.c} d={s.d} i={i} />
      ))}
      <div style={{ transform: `scale(${badge}) translateY(${floatY(frame, 7)}px)`, width: 170, height: 170, borderRadius: "50%", background: C.teal, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
        <CheckIcon size={96} />
      </div>
      <div style={{ opacity: text, fontSize: 74, fontWeight: 800, color: C.ink, textAlign: "center" }}>Готово!</div>
      <div style={{ opacity: text, fontSize: 40, fontWeight: 600, color: C.muted, textAlign: "center", maxWidth: 1100 }}>
        Далі — жива пісочниця і квіз у застосунку GitШлях
      </div>
      <div style={{ opacity: foot, marginTop: 22, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 58, height: 58, borderRadius: 18, background: C.teal, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
          <BranchIcon size={34} />
        </div>
        <span style={{ fontSize: 44, fontWeight: 800, color: C.ink }}>GitШлях</span>
      </div>
    </AbsoluteFill>
  );
};

// ============ ROOT COMPOSITION ============
export const Lesson1: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = frame / (LESSON1_DURATION - 1);
  let from = 0;
  const at = (n: number) => {
    const f = from;
    from += n;
    return f;
  };
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily }}>
      {/* озвучка */}
      <Audio src={staticFile("audio/lesson-01.mp3")} />

      {/* м'які фонові плями */}
      <div style={{ position: "absolute", top: -160, left: -120, width: 620, height: 620, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,212,191,.20), transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -200, right: -160, width: 720, height: 720, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,110,224,.16), transparent 70%)" }} />

      <Sequence from={at(SCENES.intro)} durationInFrames={SCENES.intro}><Intro /></Sequence>
      <Sequence from={at(SCENES.analogy)} durationInFrames={SCENES.analogy}><Analogy /></Sequence>
      <Sequence from={at(SCENES.why)} durationInFrames={SCENES.why}><Why /></Sequence>
      <Sequence from={at(SCENES.concepts)} durationInFrames={SCENES.concepts}><Concepts /></Sequence>
      <Sequence from={at(SCENES.commit)} durationInFrames={SCENES.commit}><CommitFlow /></Sequence>
      <Sequence from={at(SCENES.outro)} durationInFrames={SCENES.outro}><Outro /></Sequence>

      {/* водяний знак + прогрес */}
      <div style={{ position: "absolute", left: 54, bottom: 46, display: "flex", alignItems: "center", gap: 12, opacity: 0.6 }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: C.teal, display: "grid", placeItems: "center" }}>
          <BranchIcon size={20} />
        </div>
        <span style={{ fontSize: 26, fontWeight: 800, color: C.ink }}>GitШлях</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: "rgba(17,74,68,.08)" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.teal2})` }} />
      </div>
    </AbsoluteFill>
  );
};
