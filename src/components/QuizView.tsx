"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getIcon } from "@/lib/icons";
import type { QuizQuestion } from "@/lib/course-data";

export function QuizView({
  questions,
  moduleSlug,
  profile,
  nextSlug,
}: {
  questions: QuizQuestion[];
  moduleSlug: string;
  profile: string | null;
  nextSlug?: string;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);

  const q = questions[index];
  const isLast = index === questions.length - 1;

  function choose(optionIndex: number) {
    if (selected !== null) return;
    setSelected(optionIndex);
    if (optionIndex === q.correctIndex) setScore((s) => s + 1);
  }

  async function next() {
    if (!isLast) {
      setIndex((i) => i + 1);
      setSelected(null);
      return;
    }
    setFinished(true);
    if (profile) {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          moduleSlug,
          quizScore: score,
        }),
      });
      setSaved(true);
    }
  }

  if (finished) {
    return (
      <div className="clay-card px-6 py-8 text-center">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal-soft text-teal">
          <FontAwesomeIcon icon={getIcon("circle-check")} className="h-6 w-6" />
        </span>
        <h3 className="font-display text-xl font-bold">
          {score} з {questions.length} правильно
        </h3>
        <p className="mt-1 text-sm text-foreground-muted">
          {saved
            ? "Результат збережено в твоєму профілі."
            : "Обери профіль на головній, щоб зберігати прогрес."}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/roadmap"
            className="clay-btn clay-card-soft px-5 py-2.5 text-sm font-semibold"
          >
            До дорожньої карти
          </Link>
          {nextSlug && (
            <Link
              href={`/lesson/${nextSlug}`}
              className="clay-btn bg-teal px-5 py-2.5 text-sm font-semibold text-white"
            >
              Наступний урок
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="clay-card px-6 py-6">
      <p className="mb-4 text-sm font-medium text-foreground-muted">
        Питання {index + 1} з {questions.length}
      </p>
      <h3 className="mb-4 font-semibold">{q.question}</h3>

      <div className="flex flex-col gap-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correctIndex;
          const isChosen = i === selected;
          let cls =
            "clay-card-soft border-border-soft hover:shadow-clay text-left";
          if (selected !== null) {
            if (isCorrect) cls = "border-teal bg-teal-soft text-left";
            else if (isChosen) cls = "border-amber bg-amber-soft text-left";
            else cls = "border-border-soft opacity-60 text-left";
          }
          return (
            <button
              key={opt}
              onClick={() => choose(i)}
              className={`clay-btn rounded-2xl border px-4 py-3 text-sm font-medium transition ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected !== null && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <p className="text-sm text-foreground-muted">{q.explanation}</p>
            <button
              onClick={next}
              className="clay-btn mt-4 w-full bg-teal py-2.5 text-sm font-semibold text-white sm:w-auto sm:px-6"
            >
              {isLast ? "Завершити" : "Далі"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
