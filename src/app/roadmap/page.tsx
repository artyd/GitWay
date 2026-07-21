"use client";

import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { ProgressBar } from "@/components/ProgressBar";
import { PhaseSection } from "@/components/PhaseSection";
import { phases, modules, modulesByPhase } from "@/lib/course-data";
import { useProfile } from "@/lib/useProfile";

export default function RoadmapPage() {
  const { profile, ready } = useProfile();
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (!ready || !profile) return;
    fetch(`/api/progress?profile=${encodeURIComponent(profile)}`)
      .then((r) => r.json())
      .then((data) => setCompleted(data.completedModules ?? []));
  }, [ready, profile]);

  return (
    <>
      <NavBar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {ready && profile ? `Привіт, ${profile}!` : "Дорожня карта курсу"}
        </h1>
        <p className="mt-1 mb-6 text-foreground-muted">
          11 уроків, 3 фази. Почни з першого — інші відкриються самі собою.
        </p>

        <div className="clay-card-soft mb-8 px-5 py-4">
          <ProgressBar completed={completed.length} total={modules.length} />
        </div>

        {phases.map((phase) => (
          <PhaseSection
            key={phase.key}
            phase={phase}
            modules={modulesByPhase(phase.key)}
            completed={completed}
          />
        ))}
      </main>
    </>
  );
}
