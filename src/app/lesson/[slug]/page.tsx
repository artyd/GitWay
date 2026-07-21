"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getIcon } from "@/lib/icons";
import { getModule, getPhase, modules } from "@/lib/course-data";
import { phaseStyles } from "@/lib/phase-styles";
import { NavBar } from "@/components/NavBar";
import { Sandbox } from "@/components/Sandbox";
import { QuizView } from "@/components/QuizView";
import { useProfile } from "@/lib/useProfile";

export default function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const mod = getModule(slug);
  const { profile } = useProfile();

  if (!mod) notFound();

  const phase = getPhase(mod.phase);
  const styles = phaseStyles[phase.color];
  const next = modules.find((m) => m.order === mod.order + 1);

  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <Link
          href="/roadmap"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted hover:text-foreground"
        >
          ← До дорожньої карти
        </Link>

        <div className="mb-6 flex items-start gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${styles.bgSoft} ${styles.text}`}
          >
            <FontAwesomeIcon icon={getIcon(mod.icon)} className="h-5 w-5" />
          </span>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${styles.text}`}>
              {phase.title} · {mod.duration}
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              {mod.title}
            </h1>
          </div>
        </div>

        {!mod.isReady ? (
          <div className="clay-card-soft px-6 py-10 text-center">
            <p className="font-semibold">Цей урок ще в розробці</p>
            <p className="mt-1 text-sm text-foreground-muted">{mod.teaser}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="clay-card flex aspect-video items-center justify-center bg-surface-soft text-foreground-muted">
              <div className="text-center">
                <FontAwesomeIcon icon={getIcon("play")} className="h-6 w-6" />
                <p className="mt-2 text-sm">Тут буде відео уроку</p>
              </div>
            </div>

            {mod.analogy && (
              <div className="clay-card-soft border-l-4 border-teal px-5 py-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-teal">
                  Аналогія
                </p>
                <p className="text-sm leading-relaxed">{mod.analogy}</p>
              </div>
            )}

            {mod.intro && (
              <p className="leading-relaxed text-foreground-muted">{mod.intro}</p>
            )}

            {mod.sections?.map((s) => (
              <div key={s.heading}>
                <h2 className="mb-1.5 font-display text-lg font-bold">
                  {s.heading}
                </h2>
                <p className="leading-relaxed text-foreground-muted">{s.body}</p>
              </div>
            ))}

            {mod.sandbox && <Sandbox data={mod.sandbox} />}

            {mod.quiz && (
              <div>
                <h2 className="mb-3 font-display text-lg font-bold">
                  Перевір себе
                </h2>
                <QuizView
                  questions={mod.quiz}
                  moduleSlug={mod.slug}
                  profile={profile}
                  nextSlug={next?.slug}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
