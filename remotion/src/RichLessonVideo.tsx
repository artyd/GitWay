import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  BranchIcon,
  C,
  CheckIcon,
  CLAY,
  Cursor,
  DocIcon,
  FolderIcon,
  fontFamily,
  GearIcon,
  KeyboardIcon,
  PHASES,
  PlugIcon,
  RobotIcon,
  sceneFade,
  ShieldIcon,
  SparkIcon,
  TEAL_SHADOW,
  TerminalIcon,
  typed,
  typedDone,
  useEnter,
  WandIcon,
  floatY,
} from "./common";
import { getN, NCommand, NLesson } from "./normalize";

const FPS = 30;
const CPS = 34; // швидкість «набору» команд

const mainIcon = (l: NLesson, size: number, color = "#fff") =>
  l.icon === "robot" ? <RobotIcon size={size} color={color} /> : l.icon === "wand" ? <WandIcon size={size} color={color} /> : <BranchIcon size={size} color={color} />;

// декоративні іконки для карток-абзаців
const BLOCK_ICONS = [DocIcon, FolderIcon, ShieldIcon, GearIcon, PlugIcon, KeyboardIcon];

// ── таймлайн ──
type SceneSpec = { dur: number; kind: "intro" | "lead" | "block" | "terminal" | "outro"; idx?: number };
const cmdFrames = (c: NCommand) => Math.max(26, Math.round((c.cmd.length / CPS) * FPS)) + 58; // набір + вивід/пауза

function specs(l: NLesson): SceneSpec[] {
  const out: SceneSpec[] = [];
  out.push({ dur: 120, kind: "intro" });
  out.push({ dur: 175, kind: "lead" });
  l.blocks.slice(0, 6).forEach((_, i) => out.push({ dur: 150, kind: "block", idx: i }));
  out.push({ dur: 90 + l.commands.reduce((a, c) => a + cmdFrames(c), 0), kind: "terminal" });
  out.push({ dur: 120, kind: "outro" });
  return out;
}
function scaledSpecs(l: NLesson, target?: number): SceneSpec[] {
  const base = specs(l);
  const total = base.reduce((a, s) => a + s.dur, 0);
  if (!target || target <= total) return base;
  const k = target / total;
  const scaled = base.map((s) => ({ ...s, dur: Math.round(s.dur * k) }));
  scaled[scaled.length - 1].dur += target - scaled.reduce((a, s) => a + s.dur, 0);
  return scaled;
}
export const richBaseDuration = (id: number) => specs(getN(id)).reduce((a, s) => a + s.dur, 0);

// анімований фон
const Backdrop: React.FC<{ color: string }> = ({ color }) => {
  const f = useCurrentFrame();
  return (
    <>
      <div style={{ position: "absolute", top: -160 + floatY(f, 26, 60), left: -120 + floatY(f, 20, 80), width: 640, height: 640, borderRadius: "50%", background: `radial-gradient(circle, ${color}2e, transparent 70%)` }} />
      <div style={{ position: "absolute", bottom: -200 - floatY(f, 24, 70), right: -160 - floatY(f, 18, 90), width: 740, height: 740, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,212,191,.20), transparent 70%)" }} />
      {[...Array(7)].map((_, i) => (
        <div key={i} style={{ position: "absolute", left: `${12 + i * 12}%`, top: `${20 + ((i * 37) % 60)}%`, width: 10, height: 10, borderRadius: "50%", background: color, opacity: 0.14, transform: `translateY(${floatY(f, 16, 40 + i * 6, i)}px)` }} />
      ))}
    </>
  );
};

// ── INTRO ──
const Intro: React.FC<{ l: NLesson }> = ({ l }) => {
  const f = useCurrentFrame();
  const ph = PHASES[l.phase];
  const badge = useEnter(0, 11);
  const pill = useEnter(14);
  const words = l.title.split(" ");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, padding: "0 120px" }}>
      <div style={{ transform: `scale(${badge}) rotate(${interpolate(badge, [0, 1], [-25, 0])}deg) translateY(${floatY(f, 8)}px)`, width: 168, height: 168, borderRadius: 46, background: ph.color, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
        {mainIcon(l, 90)}
      </div>
      <div style={{ opacity: pill, transform: `translateY(${interpolate(pill, [0, 1], [16, 0])}px)`, padding: "11px 30px", borderRadius: 30, background: `${ph.color}22`, color: ph.color, fontWeight: 800, fontSize: 27, letterSpacing: 1 }}>
        {l.kicker}
      </div>
      <div style={{ fontSize: 90, fontWeight: 800, color: C.ink, letterSpacing: -1.5, textAlign: "center", lineHeight: 1.08, maxWidth: 1560, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 26px" }}>
        {words.map((w, i) => {
          const e = interpolate(f, [22 + i * 4, 38 + i * 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <span key={i} style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [28, 0])}px)` }}>{w}</span>;
        })}
      </div>
      <div style={{ width: interpolate(f, [30, 46], [0, 260], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), height: 8, borderRadius: 8, background: `linear-gradient(90deg, ${ph.color}, ${C.teal2})` }} />
    </AbsoluteFill>
  );
};

// ── LEAD ──
const Lead: React.FC<{ l: NLesson }> = ({ l }) => {
  const f = useCurrentFrame();
  const ph = PHASES[l.phase];
  const card = useEnter(0, 16);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 150px" }}>
      <div style={{ opacity: card, transform: `translateY(${interpolate(card, [0, 1], [30, 0])}px) scale(${interpolate(card, [0, 1], [0.97, 1])})`, maxWidth: 1520, background: C.white, borderRadius: 36, padding: "58px 66px", boxShadow: CLAY, borderLeft: `14px solid ${ph.color}`, position: "relative" }}>
        <div style={{ position: "absolute", top: -34, left: 54, width: 78, height: 78, borderRadius: 22, background: ph.color, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW, transform: `translateY(${floatY(f, 5)}px)` }}>
          <SparkIcon size={40} />
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: ph.color, letterSpacing: 1, margin: "14px 0 18px" }}>ПРО ЩО УРОК</div>
        <div style={{ fontSize: 45, fontWeight: 600, color: "#3f524e", lineHeight: 1.45 }}>{l.lead}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── BLOCK (абзац теорії) ──
const Block: React.FC<{ l: NLesson; idx: number }> = ({ l, idx }) => {
  const f = useCurrentFrame();
  const ph = PHASES[l.phase];
  const card = useEnter(0, 16);
  const Ic = BLOCK_ICONS[idx % BLOCK_ICONS.length];
  const text = l.blocks[idx];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 150px" }}>
      <div style={{ opacity: card, transform: `translateX(${interpolate(card, [0, 1], [idx % 2 ? 40 : -40, 0])}px)`, display: "flex", gap: 34, alignItems: "center", maxWidth: 1540, background: C.white, borderRadius: 32, padding: "46px 54px", boxShadow: CLAY }}>
        <div style={{ flex: "none", width: 110, height: 110, borderRadius: 28, background: `${ph.color}18`, display: "grid", placeItems: "center", transform: `translateY(${floatY(f, 5, 30)}px)` }}>
          <Ic size={54} color={ph.color} />
        </div>
        <div style={{ fontSize: 40, fontWeight: 500, color: "#3f524e", lineHeight: 1.5 }}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};

// ── TERMINAL (анімований) ──
const TerminalScene: React.FC<{ l: NLesson }> = ({ l }) => {
  const f = useCurrentFrame();
  const head = useEnter(0);
  const card = useEnter(8, 16);
  // кумулятивні старти команд
  const starts: number[] = [];
  let acc = 20;
  for (const c of l.commands) { starts.push(acc); acc += cmdFrames(c); }
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36, padding: "0 120px" }}>
      <div style={{ opacity: head, transform: `translateY(${interpolate(head, [0, 1], [-16, 0])}px)`, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: C.teal, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
          <TerminalIcon size={32} />
        </div>
        <div style={{ fontSize: 46, fontWeight: 800, color: C.ink }}>Спробуймо в терміналі</div>
      </div>
      <div style={{ transform: `scale(${interpolate(card, [0, 1], [0.96, 1])})`, opacity: card, width: 1480, minHeight: 560, background: "#0f2a27", borderRadius: 30, padding: "40px 54px", boxShadow: "0 44px 90px -34px rgba(17,74,68,.6), inset 0 3px 16px rgba(0,0,0,.4)" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 34 }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#febc2e" }} />
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#28c840" }} />
        </div>
        {l.commands.map((c, i) => {
          const st = starts[i];
          if (f < st) return null;
          const full = typedDone(c.cmd, f, st, CPS);
          const shown = typed(c.cmd, f, st, CPS);
          const typeEnd = st + Math.max(26, Math.round((c.cmd.length / CPS) * FPS));
          const outOp = interpolate(f, [typeEnd + 6, typeEnd + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const isCurrent = i === l.commands.length - 1 || f < starts[i + 1];
          return (
            <div key={i} style={{ marginBottom: 26 }}>
              <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 34, fontWeight: 700, color: "#7ee6d3" }}>
                <span style={{ color: "#2dd4bf" }}>$ </span>
                {shown}
                {isCurrent && !full && <Cursor frame={f} />}
              </div>
              {full && (
                <div style={{ opacity: outOp, display: "flex", alignItems: "center", gap: 14, marginTop: 12, paddingLeft: 30 }}>
                  <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 9, background: C.teal2, flex: "none" }}>
                    <CheckIcon size={18} />
                  </span>
                  <span style={{ fontSize: 27, color: "#9fd8cd", lineHeight: 1.35 }}>{c.desc}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── OUTRO ──
const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const badge = useEnter(0, 10);
  const text = useEnter(12);
  const foot = useEnter(24);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
      <div style={{ transform: `scale(${badge}) translateY(${floatY(f, 7)}px)`, width: 172, height: 172, borderRadius: "50%", background: C.teal, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
        <CheckIcon size={98} />
      </div>
      <div style={{ opacity: text, fontSize: 76, fontWeight: 800, color: C.ink }}>Готово!</div>
      <div style={{ opacity: text, fontSize: 38, fontWeight: 600, color: C.muted, textAlign: "center", maxWidth: 1180 }}>
        Далі — практика й командний квіз у застосунку GitШлях
      </div>
      <div style={{ opacity: foot, marginTop: 18, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 58, height: 58, borderRadius: 18, background: C.teal, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
          <BranchIcon size={34} />
        </div>
        <span style={{ fontSize: 44, fontWeight: 800, color: C.ink }}>GitШлях</span>
      </div>
    </AbsoluteFill>
  );
};

// ── ROOT ──
export const RichLessonVideo: React.FC<{ lessonId: number; audioSrc?: string; audioFrames?: number }> = ({ lessonId, audioSrc, audioFrames }) => {
  const l = getN(lessonId);
  const f = useCurrentFrame();
  const scenes = scaledSpecs(l, audioFrames);
  const total = scenes.reduce((a, s) => a + s.dur, 0);
  const ph = PHASES[l.phase];
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily }}>
      {audioSrc && <Audio src={staticFile(audioSrc)} />}
      <Backdrop color={ph.color} />
      {scenes.map((sc, i) => {
        const start = from;
        from += sc.dur;
        let node: React.ReactNode = null;
        if (sc.kind === "intro") node = <Intro l={l} />;
        else if (sc.kind === "lead") node = <Lead l={l} />;
        else if (sc.kind === "block") node = <Block l={l} idx={sc.idx!} />;
        else if (sc.kind === "terminal") node = <TerminalScene l={l} />;
        else node = <Outro />;
        return (
          <Sequence key={i} from={start} durationInFrames={sc.dur}>
            <FadeWrap dur={sc.dur}>{node}</FadeWrap>
          </Sequence>
        );
      })}
      {/* бренд + прогрес */}
      <div style={{ position: "absolute", left: 54, bottom: 46, display: "flex", alignItems: "center", gap: 12, opacity: 0.6 }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: C.teal, display: "grid", placeItems: "center" }}>
          <BranchIcon size={20} />
        </div>
        <span style={{ fontSize: 26, fontWeight: 800, color: C.ink }}>GitШлях</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: "rgba(17,74,68,.08)" }}>
        <div style={{ height: "100%", width: `${(f / (total - 1)) * 100}%`, background: `linear-gradient(90deg, ${ph.color}, ${C.teal2})` }} />
      </div>
    </AbsoluteFill>
  );
};

// плавна поява/зникнення кожної сцени
const FadeWrap: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const { opacity, y } = sceneFade(f, dur);
  return <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)` }}>{children}</AbsoluteFill>;
};
