"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getIcon } from "@/lib/icons";
import type { Sandbox as SandboxData } from "@/lib/course-data";

export function Sandbox({ data }: { data: SandboxData }) {
  const [doneCount, setDoneCount] = useState(0);
  const allDone = doneCount >= data.steps.length;

  return (
    <div className="clay-card overflow-hidden">
      <div className="border-b border-border-soft bg-surface-soft px-5 py-4">
        <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-teal">
          <FontAwesomeIcon icon={getIcon("terminal")} className="h-3.5 w-3.5" />
          Пісочниця
        </p>
        <h3 className="mt-1 font-semibold">{data.title}</h3>
        <p className="mt-1 text-sm text-foreground-muted">{data.description}</p>
      </div>

      <div className="flex flex-col gap-3 px-5 py-5">
        {data.steps.map((step, i) => {
          const isDone = i < doneCount;
          const isNext = i === doneCount;

          return (
            <div key={step.label}>
              <button
                disabled={!isNext && !isDone}
                onClick={() => isNext && setDoneCount(i + 1)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                  isDone
                    ? "border-teal/30 bg-teal-soft text-foreground"
                    : isNext
                    ? "clay-btn border-border-strong bg-surface hover:shadow-clay"
                    : "cursor-not-allowed border-border-soft bg-surface-soft text-foreground-muted opacity-60"
                }`}
              >
                <FontAwesomeIcon
                  icon={getIcon(isDone ? "circle-check" : "play")}
                  className={`h-4 w-4 shrink-0 ${isDone ? "text-teal" : ""}`}
                />
                {step.label}
              </button>

              <AnimatePresence>
                {isDone && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-4 mt-1.5 border-l-2 border-teal/30 pl-3 text-sm text-foreground-muted"
                  >
                    {step.result}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-1 rounded-2xl bg-teal px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Готово! Ти щойно зробив свій перший коміт 🎉
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
