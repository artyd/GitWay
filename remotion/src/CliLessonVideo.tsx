import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  BranchIcon,
  C,
  CheckIcon,
  CLAY,
  fontFamily,
  PHASES,
  TEAL_SHADOW,
  useEnter,
  floatY,
  WandIcon,
} from "./common";
import cliData from "./cli-lessons.json";

type Cmd = { cmd: string; desc: string };
type CliLesson = {
  id: number;
  phase: number;
  course: string;
  pos: number;
  total: number;
  title: string;
  lead: string;
  paragraphs: string[];
  commands: Cmd[];
  audio: string;
};

const lessons = cliData as unknown as CliLesson[];
export const getCli = (id: number) => lessons.find((l) => l.id === id)!;

// ── таймлайн ──
type SceneSpec = { dur: number; kind: "intro" | "lead" | "para" | "commands" | "outro"; idx?: number };

function specs(l: CliLesson): SceneSpec[] {
  const out: SceneSpec[] = [];
  out.push({ dur: 110, kind: "intro" });
  out.push({ dur: 200, kind: "lead" });
  l.paragraphs.forEach((_, i) => out.push({ dur: 190, kind: "para", idx: i }));
  out.push({ dur: 140 + l.commands.length * 74, kind: "commands" });
  out.push({ dur: 120, kind: "outro" });
  return out;
}

function scaledSpecs(l: CliLesson, targetTotal?: number): SceneSpec[] {
  const base = specs(l);
  const baseTotal = base.reduce((a, s) => a + s.dur, 0);
  if (!targetTotal || targetTotal <= baseTotal) return base;
  const k = targetTotal / baseTotal;
  const scaled = base.map((s) => ({ ...s, dur: Math.round(s.dur * k) }));
  const drift = targetTotal - scaled.reduce((a, s) => a + s.dur, 0);
  scaled[scaled.length - 1].dur += drift;
  return scaled;
}

export const cliBaseDuration = (id: number) => specs(getCli(id)).reduce((a, s) => a + s.dur, 0);

// ============ INTRO ============
const Intro: React.FC<{ l: CliLesson }> = ({ l }) => {
  const frame = useCurrentFrame();
  const ph = PHASES[l.phase];
  const badge = useEnter(0, 12);
  const pill = useEnter(12);
  const title = useEnter(20);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: "0 120px" }}>
      <div style={{ transform: `scale(${badge}) translateY(${floatY(frame, 7)}px)`, width: 160, height: 160, borderRadius: 44, background: ph.color, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
        <WandIcon size={80} />
      </div>
      <div style={{ opacity: pill, transform: `translateY(${interpolate(pill, [0, 1], [14, 0])}px)`, padding: "10px 28px", borderRadius: 30, background: `${ph.color}22`, color: ph.color, fontWeight: 800, fontSize: 28, letterSpacing: 1 }}>
        {l.course.toUpperCase()} · УРОК {l.pos} / {l.total}
      </div>
      <div style={{ opacity: title, transform: `translateY(${interpolate(title, [0, 1], [30, 0])}px)`, fontSize: 88, fontWeight: 800, color: C.ink, letterSpacing: -1.5, textAlign: "center", lineHeight: 1.1, maxWidth: 1500 }}>
        {l.title}
      </div>
    </AbsoluteFill>
  );
};

// ============ LEAD ============
const Lead: React.FC<{ l: CliLesson }> = ({ l }) => {
  const ph = PHASES[l.phase];
  const card = useEnter(0, 18);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 150px" }}>
      <div style={{ opacity: card, transform: `translateY(${interpolate(card, [0, 1], [26, 0])}px)`, maxWidth: 1500, background: C.white, borderRadius: 34, padding: "60px 70px", boxShadow: CLAY, borderLeft: `12px solid ${ph.color}` }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: ph.color, letterSpacing: 1, marginBottom: 20 }}>ПРО ЩО УРОК</div>
        <div style={{ fontSize: 46, fontWeight: 600, color: "#3f524e", lineHeight: 1.45 }}>{l.lead}</div>
      </div>
    </AbsoluteFill>
  );
};

// ============ PARAGRAPH ============
const Para: React.FC<{ l: CliLesson; idx: number }> = ({ l, idx }) => {
  const ph = PHASES[l.phase];
  const card = useEnter(0, 18);
  const text = l.paragraphs[idx];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 150px" }}>
      <div style={{ opacity: card, transform: `translateX(${interpolate(card, [0, 1], [-30, 0])}px)`, display: "flex", gap: 28, alignItems: "flex-start", maxWidth: 1520, background: C.white, borderRadius: 30, padding: "48px 56px", boxShadow: CLAY }}>
        <div style={{ flex: "none", marginTop: 8, width: 20, height: 20, borderRadius: 7, background: ph.color }} />
        <div style={{ fontSize: 42, fontWeight: 500, color: "#3f524e", lineHeight: 1.5 }}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};

// ============ COMMANDS ============
const CmdLine: React.FC<{ delay: number; c: Cmd }> = ({ delay, c }) => {
  const e = useEnter(delay, 18);
  const d = useEnter(delay + 16, 18);
  return (
    <div style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [22, 0])}px)`, marginBottom: 26 }}>
      <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 36, fontWeight: 700, color: "#7ee6d3" }}>
        <span style={{ color: "#2dd4bf" }}>$ </span>
        {c.cmd}
      </div>
      <div style={{ opacity: d, fontSize: 27, color: "#9fd8cd", lineHeight: 1.4, marginTop: 10, paddingLeft: 34 }}>{c.desc}</div>
    </div>
  );
};
const Commands: React.FC<{ l: CliLesson }> = ({ l }) => {
  const head = useEnter(0);
  const card = useEnter(8, 18);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "0 120px" }}>
      <div style={{ opacity: head, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: C.teal, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
          <WandIcon size={32} />
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: C.ink }}>Команди цього уроку</div>
      </div>
      <div style={{ transform: `scale(${interpolate(card, [0, 1], [0.96, 1])})`, opacity: card, width: 1480, background: "#0f2a27", borderRadius: 30, padding: "48px 60px", boxShadow: "0 40px 80px -30px rgba(17,74,68,.55), inset 0 3px 16px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 34 }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#febc2e" }} />
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#28c840" }} />
        </div>
        {l.commands.map((c, i) => (
          <CmdLine key={i} delay={16 + i * 34} c={c} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ============ OUTRO ============
const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const badge = useEnter(0, 10);
  const text = useEnter(12);
  const foot = useEnter(24);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
      <div style={{ transform: `scale(${badge}) translateY(${floatY(frame, 7)}px)`, width: 170, height: 170, borderRadius: "50%", background: C.teal, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
        <CheckIcon size={96} />
      </div>
      <div style={{ opacity: text, fontSize: 74, fontWeight: 800, color: C.ink }}>Готово!</div>
      <div style={{ opacity: text, fontSize: 38, fontWeight: 600, color: C.muted, textAlign: "center", maxWidth: 1100 }}>
        Далі — практика у вкладці CLI і командний квіз у застосунку GitШлях
      </div>
      <div style={{ opacity: foot, marginTop: 20, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 58, height: 58, borderRadius: 18, background: C.teal, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
          <BranchIcon size={34} />
        </div>
        <span style={{ fontSize: 44, fontWeight: 800, color: C.ink }}>GitШлях</span>
      </div>
    </AbsoluteFill>
  );
};

// ============ ROOT ============
export const CliLessonVideo: React.FC<{ lessonId: number; audioSrc?: string; audioFrames?: number }> = ({ lessonId, audioSrc, audioFrames }) => {
  const l = getCli(lessonId);
  const frame = useCurrentFrame();
  const scenes = scaledSpecs(l, audioFrames);
  const total = scenes.reduce((a, sc) => a + sc.dur, 0);
  const progress = frame / (total - 1);
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily }}>
      {audioSrc && <Audio src={staticFile(audioSrc)} />}
      <div style={{ position: "absolute", top: -160, left: -120, width: 620, height: 620, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,110,224,.18), transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -200, right: -160, width: 720, height: 720, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,212,191,.16), transparent 70%)" }} />

      {scenes.map((sc, i) => {
        const f = from;
        from += sc.dur;
        let node: React.ReactNode = null;
        if (sc.kind === "intro") node = <Intro l={l} />;
        else if (sc.kind === "lead") node = <Lead l={l} />;
        else if (sc.kind === "para") node = <Para l={l} idx={sc.idx!} />;
        else if (sc.kind === "commands") node = <Commands l={l} />;
        else node = <Outro />;
        return (
          <Sequence key={i} from={f} durationInFrames={sc.dur}>
            {node}
          </Sequence>
        );
      })}

      <div style={{ position: "absolute", left: 54, bottom: 46, display: "flex", alignItems: "center", gap: 12, opacity: 0.6 }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: C.teal, display: "grid", placeItems: "center" }}>
          <BranchIcon size={20} />
        </div>
        <span style={{ fontSize: 26, fontWeight: 800, color: C.ink }}>GitШлях</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: "rgba(17,74,68,.08)" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: `linear-gradient(90deg, ${PHASES[l.phase].color}, ${C.teal2})` }} />
      </div>
    </AbsoluteFill>
  );
};
