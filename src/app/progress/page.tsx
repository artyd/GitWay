"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getIcon } from "@/lib/icons";
import { NavBar } from "@/components/NavBar";
import { ProgressBar } from "@/components/ProgressBar";
import { modules, getPhase } from "@/lib/course-data";
import { phaseStyles } from "@/lib/phase-styles";
import { useProfile } from "@/lib/useProfile";
import type { ProfileProgress } from "@/lib/store";

export default function ProgressPage() {
  const { profile, ready, clearProfile } = useProfile();
  const [data, setData] = useState<ProfileProgress | null>(null);

  useEffect(() => {
    if (!ready || !profile) return;
    fetch(`/api/progress?profile=${encodeURIComponent(profile)}`)
      .then((r) => r.json())
      .then(setData);
  }, [ready, profile]);

  if (ready && !profile) {
    return (
      <>
        <NavBar />
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 text-center">
          <p className="text-foreground-muted">Спочатку обери профіль.</p>
          <Link href="/" className="mt-4 inline-block font-semibold text-teal">
            До входу
          </Link>
        </main>
      </>
    );
  }

  const completed = data?.completedModules ?? [];

  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          Прогрес {profile}
        </h1>
        <p className="mt-1 mb-6 text-foreground-muted">
          Тут зберігається все, що вже пройдено — навіть з іншого пристрою.
        </p>

        <div className="clay-card-soft mb-8 px-5 py-4">
          <ProgressBar completed={completed.length} total={modules.length} />
        </div>

        <div className="flex flex-col gap-2.5">
          {modules.map((m) => {
            const isDone = completed.includes(m.slug);
            const styles = phaseStyles[getPhase(m.phase).color];
            const score = data?.quizScores?.[m.slug];
            return (
              <div
                key={m.slug}
                className="clay-card flex items-center gap-3 px-4 py-3"
              >
                <FontAwesomeIcon
                  icon={getIcon(isDone ? "circle-check" : m.icon)}
                  className={`h-4 w-4 shrink-0 ${
                    isDone ? styles.text : "text-foreground-muted"
                  }`}
                />
                <span className="flex-1 text-sm font-medium">{m.title}</span>
                {isDone && typeof score === "number" && (
                  <span className="text-xs font-semibold text-foreground-muted">
                    {score}/{m.quiz?.length ?? "—"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={clearProfile}
          className="mt-8 text-sm font-medium text-foreground-muted underline underline-offset-2 hover:text-foreground"
        >
          Змінити профіль
        </button>
      </main>
    </>
  );
}
