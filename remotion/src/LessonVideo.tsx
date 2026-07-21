import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  BranchIcon,
  BulbIcon,
  C,
  CheckIcon,
  CLAY,
  DotCheck,
  fontFamily,
  PHASES,
  TEAL_SHADOW,
  useEnter,
  floatY,
  WandIcon,
} from "./common";
import lessonsData from "./lessons.json";

type SandboxStep = { do: string; res: string };
type Section = { h: string; body: string[] };
type Lesson = {
  id: number;
  phase: number;
  title: string;
  duration: string;
  analogy: string;
  sections: Section[];
  sandbox: { title: string; intro: string; steps: SandboxStep[] };
};

const lessons = lessonsData as unknown as Lesson[];
export const getLesson = (id: number) => lessons.find((l) => l.id === id)!;

// ── таймлайн (спільний для рендеру й розрахунку тривалості) ──
type SceneSpec = { dur: number; kind: "intro" | "analogy" | "section" | "sandbox" | "outro"; idx?: number };

function specs(lesson: Lesson): SceneSpec[] {
  const out: SceneSpec[] = [];
  out.push({ dur: 100, kind: "intro" });
  out.push({ dur: 200, kind: "analogy" });
  lesson.sections.forEach((_, i) => out.push({ dur: 170, kind: "section", idx: i }));
  out.push({ dur: 130 + lesson.sandbox.steps.length * 78, kind: "sandbox" });
  out.push({ dur: 120, kind: "outro" });
  return out;
}

// Масштабуємо сцени, щоб їхня сума дорівнювала довжині озвучки (розтягуємо
// «утримання» кадрів; входові анімації лишаються на своїй швидкості).
function scaledSpecs(lesson: Lesson, targetTotal?: number): SceneSpec[] {
  const base = specs(lesson);
  const baseTotal = base.reduce((a, s) => a + s.dur, 0);
  if (!targetTotal || targetTotal <= baseTotal) return base;
  const k = targetTotal / baseTotal;
  const scaled = base.map((s) => ({ ...s, dur: Math.round(s.dur * k) }));
  const drift = targetTotal - scaled.reduce((a, s) => a + s.dur, 0);
  scaled[scaled.length - 1].dur += drift;
  return scaled;
}

export const lessonBaseDuration = (id: number) => specs(getLesson(id)).reduce((a, s) => a + s.dur, 0);
export const lessonDuration = lessonBaseDuration;

// ============ SCENE: INTRO ============
const Intro: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const frame = useCurrentFrame();
  const ph = PHASES[lesson.phase];
  const badge = useEnter(0, 12);
  const pill = useEnter(12);
  const title = useEnter(20);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: "0 120px" }}>
      <div style={{ transform: `scale(${badge}) translateY(${floatY(frame, 7)}px)`, width: 160, height: 160, borderRadius: 50, background: ph.color, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
        <span style={{ fontSize: 74, fontWeight: 800, color: "#fff" }}>{lesson.id}</span>
      </div>
      <div style={{ opacity: pill, transform: `translateY(${interpolate(pill, [0, 1], [14, 0])}px)`, padding: "10px 26px", borderRadius: 30, background: "#d8f3ee", color: "#0d7d70", fontWeight: 800, fontSize: 28, letterSpacing: 1 }}>
        УРОК {lesson.id} · {ph.name.toUpperCase()}
      </div>
      <div style={{ opacity: title, transform: `translateY(${interpolate(title, [0, 1], [30, 0])}px)`, fontSize: 92, fontWeight: 800, color: C.ink, letterSpacing: -1.5, textAlign: "center", lineHeight: 1.1 }}>
        {lesson.title}
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE: ANALOGY ============
const Analogy: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const frame = useCurrentFrame();
  const icon = useEnter(0, 14);
  const text = useEnter(12);
  // беремо перший абзац аналогії (до подвійного переносу)
  const analogy = lesson.analogy.split("\n\n")[0];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44, padding: "0 160px" }}>
      <div style={{ transform: `scale(${icon}) translateY(${floatY(frame, 6, 32)}px)`, width: 118, height: 118, borderRadius: 34, background: "#fef3e6", display: "grid", placeItems: "center", boxShadow: CLAY }}>
        <BulbIcon size={58} />
      </div>
      <div style={{ opacity: text, textAlign: "center", maxWidth: 1400 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.amber, letterSpacing: 1, marginBottom: 18 }}>АНАЛОГІЯ</div>
        <div style={{ fontSize: 46, fontWeight: 700, color: C.ink, lineHeight: 1.35 }}>{analogy}</div>
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE: SECTION ============
const SectionRow: React.FC<{ delay: number; text: string; bullet: boolean; color: string }> = ({ delay, text, bullet, color }) => {
  const e = useEnter(delay, 18);
  return (
    <div style={{ opacity: e, transform: `translateX(${interpolate(e, [0, 1], [-26, 0])}px)`, display: "flex", gap: 20, alignItems: bullet ? "center" : "flex-start", background: C.white, borderRadius: 22, padding: bullet ? "22px 30px" : "26px 34px", boxShadow: CLAY, maxWidth: 1380 }}>
      {bullet && <div style={{ flex: "none", width: 16, height: 16, borderRadius: "50%", background: color }} />}
      <div style={{ fontSize: bullet ? 34 : 36, fontWeight: bullet ? 700 : 600, color: bullet ? C.ink : "#3f524e", lineHeight: 1.4 }}>{text}</div>
    </div>
  );
};
const SectionScene: React.FC<{ lesson: Lesson; idx: number }> = ({ lesson, idx }) => {
  const sec = lesson.sections[idx];
  const ph = PHASES[lesson.phase];
  const head = useEnter(0);
  // показуємо до 4 елементів тіла, щоб вмістилось
  const items = sec.body.slice(0, 4);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: "0 130px" }}>
      <div style={{ opacity: head, transform: `translateY(${interpolate(head, [0, 1], [-18, 0])}px)`, display: "flex", alignItems: "center", gap: 18, marginBottom: 6 }}>
        <div style={{ width: 12, height: 44, borderRadius: 6, background: ph.color }} />
        <div style={{ fontSize: 54, fontWeight: 800, color: C.ink }}>{sec.h}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center", width: "100%" }}>
        {items.map((b, i) => (
          <SectionRow key={i} delay={18 + i * 16} text={b.startsWith("• ") ? b.slice(2) : b} bullet={b.startsWith("• ")} color={ph.color} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE: SANDBOX ============
const StepLine: React.FC<{ delay: number; num: number; step: SandboxStep }> = ({ delay, num, step }) => {
  const e = useEnter(delay, 18);
  const res = useEnter(delay + 20, 18);
  return (
    <div style={{ opacity: e, transform: `translateY(${interpolate(e, [0, 1], [22, 0])}px)`, marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ flex: "none", display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 14, background: C.teal, color: "#fff", fontSize: 24, fontWeight: 800 }}>{num}</span>
        <span style={{ fontSize: 34, fontWeight: 700, color: "#eafaf7" }}>{step.do}</span>
      </div>
      <div style={{ opacity: res, display: "flex", alignItems: "center", gap: 14, marginTop: 12, paddingLeft: 66 }}>
        <span style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, background: C.teal2 }}>
          <DotCheck />
        </span>
        <span style={{ fontSize: 27, color: "#9fd8cd", lineHeight: 1.35 }}>{step.res}</span>
      </div>
    </div>
  );
};
const SandboxScene: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  const head = useEnter(0);
  const card = useEnter(8, 18);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "0 120px" }}>
      <div style={{ opacity: head, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: C.teal, display: "grid", placeItems: "center", boxShadow: TEAL_SHADOW }}>
          <WandIcon size={32} />
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: C.ink }}>Пісочниця: {lesson.sandbox.title}</div>
      </div>
      <div style={{ transform: `scale(${interpolate(card, [0, 1], [0.96, 1])})`, opacity: card, width: 1420, background: "#0f2a27", borderRadius: 30, padding: "48px 60px", boxShadow: "0 40px 80px -30px rgba(17,74,68,.55), inset 0 3px 16px rgba(0,0,0,.35)" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 34 }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#ff5f57" }} />
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#febc2e" }} />
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#28c840" }} />
        </div>
        {lesson.sandbox.steps.map((st, i) => (
          <StepLine key={i} delay={16 + i * 40} num={i + 1} step={st} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE: OUTRO ============
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
        Далі — жива пісочниця і квіз у застосунку GitШлях
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
export const LessonVideo: React.FC<{ lessonId: number; audioSrc?: string; audioFrames?: number }> = ({ lessonId, audioSrc, audioFrames }) => {
  const lesson = getLesson(lessonId);
  const frame = useCurrentFrame();
  const scenes = scaledSpecs(lesson, audioFrames);
  const total = scenes.reduce((a, sc) => a + sc.dur, 0);
  const progress = frame / (total - 1);
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily }}>
      {audioSrc && <Audio src={staticFile(audioSrc)} />}
      <div style={{ position: "absolute", top: -160, left: -120, width: 620, height: 620, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,212,191,.20), transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -200, right: -160, width: 720, height: 720, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,110,224,.16), transparent 70%)" }} />

      {scenes.map((sc, i) => {
        const f = from;
        from += sc.dur;
        let node: React.ReactNode = null;
        if (sc.kind === "intro") node = <Intro lesson={lesson} />;
        else if (sc.kind === "analogy") node = <Analogy lesson={lesson} />;
        else if (sc.kind === "section") node = <SectionScene lesson={lesson} idx={sc.idx!} />;
        else if (sc.kind === "sandbox") node = <SandboxScene lesson={lesson} />;
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
        <div style={{ height: "100%", width: `${progress * 100}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.teal2})` }} />
      </div>
    </AbsoluteFill>
  );
};
