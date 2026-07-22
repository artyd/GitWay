"use client";

import { useState } from "react";
import { sx } from "@/lib/sx";
import { Icon } from "../ui";
import type { GitEngine } from "@/lib/git-engine/store";
import { LESSONS } from "@/lib/gitway-data";
import { Terminal } from "./Terminal";
import { GitHubClone } from "./GitHubClone";

/**
 * Пісочниця: справжній термінал (ліворуч) + клон GitHub (праворуч) на одній
 * спільній моделі даних. Перемикач сценаріїв зберігає контекст кожного уроку.
 */
export function SandboxPanel({ engine, account }: { engine: GitEngine; account: string }) {
  const [scenarioId, setScenarioId] = useState<number | 0>(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const scenario = LESSONS.find((l) => l.id === scenarioId);

  return (
    <main style={sx("flex:1;max-width:1360px;margin:0 auto;width:100%;padding:26px 22px 60px;animation:floatUp .4s ease")}>
      <div style={sx("display:flex;align-items:center;gap:14px;margin-bottom:6px;flex-wrap:wrap")}>
        <span style={sx("display:grid;place-items:center;width:54px;height:54px;border-radius:18px;font-size:23px;color:#fff;background:#14b8a6;box-shadow:0 10px 18px -7px rgba(20,184,166,.55),inset 0 -4px 8px rgba(6,95,85,.4),inset 0 4px 7px rgba(255,255,255,.35)")}>
          <Icon name="fa-solid fa-terminal" />
        </span>
        <div style={sx("flex:1;min-width:200px")}>
          <div style={sx("font-size:12.5px;font-weight:800;color:#8b9c97;letter-spacing:.4px")}>ПРАКТИКА БЕЗ РИЗИКУ</div>
          <h1 className="disp" style={sx("font-size:30px;font-weight:800;letter-spacing:-.6px")}>Пісочниця Git</h1>
        </div>
        <label style={sx("display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#5b6d68")}>
          <Icon name="fa-solid fa-graduation-cap" style={sx("color:#7c6ee0")} /> Сценарій уроку:
          <select
            value={scenarioId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setScenarioId(id);
              setGuideOpen(id !== 0);
            }}
            style={sx("border:none;background:#fff;border-radius:12px;padding:9px 12px;font-weight:800;color:#0f9c8c;cursor:pointer;outline:none;box-shadow:inset 0 -3px 6px rgba(17,74,68,.05),inset 0 3px 5px rgba(255,255,255,.9),0 5px 12px -8px rgba(17,74,68,.2);font-size:13px;max-width:260px")}
          >
            <option value={0}>Вільна практика</option>
            {LESSONS.map((l) => (
              <option key={l.id} value={l.id}>Урок {l.id}: {l.title}</option>
            ))}
          </select>
        </label>
      </div>
      <p style={sx("margin:0 0 16px;color:#5b6d68;font-size:15px;line-height:1.55;text-wrap:pretty")}>
        Усе відбувається у вашому браузері — жодних реальних репозиторіїв. Команди в терміналі одразу відображаються в інтерфейсі GitHub, і навпаки.
      </p>

      {scenario && guideOpen && (
        <div style={sx("border-radius:20px;background:#fff;padding:16px 20px;margin-bottom:16px;box-shadow:0 12px 30px -20px rgba(17,74,68,.3),inset 0 -4px 9px rgba(17,74,68,.04),inset 0 5px 9px rgba(255,255,255,.9)")}>
          <div style={sx("display:flex;align-items:center;gap:10px;margin-bottom:6px")}>
            <Icon name="fa-solid fa-lightbulb" style={sx("color:#f2994a")} />
            <span style={sx("font-weight:800;font-size:15px")}>{scenario.sandbox.title}</span>
            <button onClick={() => setGuideOpen(false)} style={sx("margin-left:auto;border:none;background:none;cursor:pointer;color:#a7b6b1;font-weight:700")}><Icon name="fa-solid fa-xmark" /></button>
          </div>
          <p style={sx("margin:0 0 12px;color:#5b6d68;font-size:14px;line-height:1.5")}>{scenario.sandbox.intro}</p>
          <div style={sx("display:flex;flex-direction:column;gap:8px")}>
            {scenario.sandbox.steps.map((step, i) => (
              <div key={i} style={sx("display:flex;align-items:flex-start;gap:10px")}>
                <span style={sx("display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#d8f3ee;color:#0d7d70;font-size:11.5px;font-weight:800;flex:none;margin-top:2px")}>{i + 1}</span>
                <div>
                  <code style={sx("font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:700;color:#0d7d70;background:#eafaf7;padding:2px 8px;border-radius:7px")}>{step.do}</code>
                  <span style={sx("margin-left:8px;font-size:13px;color:#8b9c97")}>{step.res}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {scenario && !guideOpen && (
        <button onClick={() => setGuideOpen(true)} style={sx("display:inline-flex;align-items:center;gap:8px;margin-bottom:16px;padding:8px 14px;border:none;cursor:pointer;border-radius:12px;font-weight:800;font-size:13px;color:#0d7d70;background:#d8f3ee")}>
          <Icon name="fa-solid fa-lightbulb" /> Показати підказки уроку
        </button>
      )}

      <div style={sx("display:flex;flex-wrap:wrap;gap:18px;align-items:stretch")}>
        <div style={sx("flex:1 1 460px;min-width:0;min-height:520px;border-radius:16px;overflow:hidden;box-shadow:0 20px 44px -20px rgba(17,74,68,.4)")}>
          <Terminal engine={engine} account={account} />
        </div>
        <div style={sx("flex:1 1 460px;min-width:0;min-height:520px;max-height:78vh")}>
          <GitHubClone engine={engine} account={account} />
        </div>
      </div>
    </main>
  );
}
