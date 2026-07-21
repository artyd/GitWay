import type { Phase, CourseModule } from "@/lib/course-data";
import { phaseStyles } from "@/lib/phase-styles";
import { ModuleCard } from "./ModuleCard";

export function PhaseSection({
  phase,
  modules,
  completed,
}: {
  phase: Phase;
  modules: CourseModule[];
  completed: string[];
}) {
  const styles = phaseStyles[phase.color];

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${styles.bg}`} />
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">
            {phase.title}
          </h2>
          <p className="text-sm text-foreground-muted">{phase.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {modules.map((m, i) => (
          <ModuleCard
            key={m.slug}
            module={m}
            color={phase.color}
            isDone={completed.includes(m.slug)}
            delay={i * 0.05}
          />
        ))}
      </div>
    </section>
  );
}
