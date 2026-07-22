import { Composition } from "remotion";
import { Lesson1, LESSON1_DURATION, FPS } from "./Lesson1";
import { LessonVideo, lessonBaseDuration } from "./LessonVideo";
import { CliLessonVideo, cliBaseDuration } from "./CliLessonVideo";
import { RichLessonVideo, richBaseDuration } from "./RichLessonVideo";
import { allN } from "./normalize";
import lessonsData from "./lessons.json";
import cliLessonsData from "./cli-lessons.json";
import audioDurations from "./audio-durations.json";
import cliDurations from "./cli-durations.json";

const otherLessons = (lessonsData as { id: number }[]).filter((l) => l.id >= 2);
const cliLessons = cliLessonsData as { id: number; audio: string }[];
const durations = audioDurations as Record<string, number>;
const cliDur = cliDurations as Record<string, number>;
const pad = (n: number) => String(n).padStart(2, "0");

// Багаті відео для уроків 2–35 (перше не чіпаємо).
const cliAudioById: Record<number, string> = Object.fromEntries(cliLessons.map((l) => [l.id, l.audio]));
const richLessons = allN
  .filter((l) => l.id >= 2)
  .map((l) => {
    const isGit = l.id <= 11;
    const sec = isGit ? durations[String(l.id)] : cliDur[String(l.id)];
    const audioSrc = sec ? (isGit ? `audio/lesson-${pad(l.id)}.mp3` : cliAudioById[l.id]) : undefined;
    return { id: l.id, sec, audioSrc };
  });

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Урок 1 — окрема композиція з озвучкою */}
      <Composition id="Lesson1" component={Lesson1} durationInFrames={LESSON1_DURATION} fps={FPS} width={1920} height={1080} />

      {/* Уроки 2–11 — генеруються з даних, тривалість підігнана під озвучку */}
      {otherLessons.map((l) => {
        const sec = durations[String(l.id)];
        const audioFrames = sec ? Math.round(sec * FPS) : undefined;
        const durationInFrames = audioFrames ?? lessonBaseDuration(l.id);
        return (
          <Composition
            key={l.id}
            id={`Lesson${l.id}`}
            component={LessonVideo}
            durationInFrames={durationInFrames}
            fps={FPS}
            width={1920}
            height={1080}
            defaultProps={{
              lessonId: l.id,
              audioSrc: sec ? `audio/lesson-${pad(l.id)}.mp3` : undefined,
              audioFrames,
            }}
          />
        );
      })}

      {/* CLI-курси (Claude Code / Codex) — уроки 12–35, тривалість під озвучку */}
      {cliLessons.map((l) => {
        const sec = cliDur[String(l.id)];
        const audioFrames = sec ? Math.round(sec * FPS) : undefined;
        const durationInFrames = audioFrames ?? cliBaseDuration(l.id);
        return (
          <Composition
            key={l.id}
            id={`CliLesson${l.id}`}
            component={CliLessonVideo}
            durationInFrames={durationInFrames}
            fps={FPS}
            width={1920}
            height={1080}
            defaultProps={{ lessonId: l.id, audioSrc: sec ? l.audio : undefined, audioFrames }}
          />
        );
      })}

      {/* Багаті відео (анімований термінал, переходи, іконки) — уроки 2–35 */}
      {richLessons.map((l) => {
        const audioFrames = l.sec ? Math.round(l.sec * FPS) : undefined;
        const durationInFrames = audioFrames ?? richBaseDuration(l.id);
        return (
          <Composition
            key={l.id}
            id={`RichLesson${l.id}`}
            component={RichLessonVideo}
            durationInFrames={durationInFrames}
            fps={FPS}
            width={1920}
            height={1080}
            defaultProps={{ lessonId: l.id, audioSrc: l.audioSrc, audioFrames }}
          />
        );
      })}
    </>
  );
};
