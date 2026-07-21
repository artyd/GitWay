"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getIcon } from "@/lib/icons";
import { phaseStyles, type PhaseColor } from "@/lib/phase-styles";
import type { CourseModule } from "@/lib/course-data";

export function ModuleCard({
  module: m,
  color,
  isDone,
  delay,
}: {
  module: CourseModule;
  color: PhaseColor;
  isDone: boolean;
  delay: number;
}) {
  const styles = phaseStyles[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
    >
      <Link
        href={`/lesson/${m.slug}`}
        className="clay-card group flex items-center gap-4 px-5 py-4 transition-shadow hover:shadow-clay-hover"
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.bgSoft} ${styles.text}`}
        >
          <FontAwesomeIcon icon={getIcon(m.icon)} className="h-4.5 w-4.5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{m.title}</span>
            {!m.isReady && (
              <span className="shrink-0 rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-foreground-muted">
                скоро
              </span>
            )}
          </span>
          <span className="block text-sm text-foreground-muted">
            {m.teaser} · {m.duration}
          </span>
        </span>

        {isDone ? (
          <FontAwesomeIcon
            icon={getIcon("circle-check")}
            className={`h-5 w-5 shrink-0 ${styles.text}`}
          />
        ) : (
          <FontAwesomeIcon
            icon={getIcon("arrow-right")}
            className="h-4 w-4 shrink-0 text-foreground-muted opacity-0 transition group-hover:opacity-100"
          />
        )}
      </Link>
    </motion.div>
  );
}
