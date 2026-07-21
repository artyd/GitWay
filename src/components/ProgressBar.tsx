"use client";

import { motion } from "motion/react";

export function ProgressBar({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm font-medium text-foreground-muted">
        <span>Прогрес курсу</span>
        <span>
          {completed} з {total} уроків
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-surface-soft">
        <motion.div
          className="h-full rounded-full bg-teal"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
