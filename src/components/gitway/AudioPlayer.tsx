"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Окремий аудіоплеер (озвучка уроку) — claymorphism, анімації через motion,
 * іконки Font Awesome. Доступний: seekable range, aria-labels, focus-стани.
 */
export function AudioPlayer({ src, title = "Аудіо-версія уроку" }: { src: string; title?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seek = (value: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = value;
    setCurrent(value);
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "18px 22px",
        borderRadius: 24,
        marginBottom: 22,
        background: "#fff",
        boxShadow:
          "0 14px 32px -18px rgba(17,74,68,.3), inset 0 -5px 11px rgba(17,74,68,.045), inset 0 6px 11px rgba(255,255,255,.9)",
      }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
      />

      <motion.button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Пауза" : "Відтворити озвучку"}
        whileTap={{ scale: 0.92 }}
        whileHover={{ y: -2 }}
        style={{
          flex: "none",
          display: "grid",
          placeItems: "center",
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          color: "#fff",
          fontSize: 20,
          background: "#14b8a6",
          boxShadow:
            "0 12px 22px -8px rgba(20,184,166,.6), inset 0 -5px 10px rgba(6,95,85,.4), inset 0 5px 9px rgba(255,255,255,.35)",
        }}
      >
        <i className={playing ? "fa-solid fa-pause" : "fa-solid fa-play"} style={{ marginLeft: playing ? 0 : 3 }} aria-hidden="true" />
      </motion.button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 800, fontSize: 15, color: "#14332f" }}>
            <i className="fa-solid fa-headphones" style={{ color: "#14b8a6", fontSize: 15 }} aria-hidden="true" />
            {title}
          </span>
          <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, fontWeight: 700, color: "#8b9c97" }}>
            {fmt(current)} / {fmt(duration)}
          </span>
        </div>

        {/* доріжка прогресу з нативним range для клавіатури */}
        <div style={{ position: "relative", height: 12, display: "flex", alignItems: "center" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 20,
              background: "#e4ebe8",
              boxShadow: "inset 0 2px 5px rgba(17,74,68,.13)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${pct}%`,
              borderRadius: 20,
              background: "linear-gradient(90deg,#14b8a6,#2dd4bf)",
              boxShadow: "0 2px 6px rgba(20,184,166,.5)",
            }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Перемотати озвучку"
            style={{
              position: "relative",
              width: "100%",
              height: 20,
              margin: 0,
              background: "transparent",
              accentColor: "#14b8a6",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
