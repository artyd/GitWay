"use client";

import { useMemo, useState } from "react";
import { sx } from "@/lib/sx";
import { Icon } from "../ui";
import { Terminal } from "../sandbox/Terminal";
import { CliSim, simComplete, SIM_TABLES, CLI_TOOLS } from "@/lib/cli-sim";

/**
 * Вкладка «CLI»: інтерактивний симулятор агентних CLI (Claude Code / Codex).
 * Використовує той самий компонент Terminal, що й Пісочниця, але з бекендом
 * CliSim (таблиця команд-відповідей із JSON), а не Git-рушієм.
 */
export function CliPanel({ account }: { account: string }) {
  const [tool, setTool] = useState<"claude" | "codex">("claude");
  const table = SIM_TABLES[tool];
  // Окремий екземпляр симулятора на кожен інструмент (стан сесії тримається в ньому).
  const sim = useMemo(() => new CliSim(SIM_TABLES[tool]), [tool]);
  const complete = useMemo(() => simComplete(table), [table]);
  const meta = CLI_TOOLS.find((t) => t.key === tool)!;

  return (
    <main style={sx("flex:1;max-width:1000px;margin:0 auto;width:100%;padding:26px 22px 60px;animation:floatUp .4s ease")}>
      <div style={sx("display:flex;align-items:center;gap:14px;margin-bottom:6px;flex-wrap:wrap")}>
        <span style={sx(`display:grid;place-items:center;width:54px;height:54px;border-radius:18px;font-size:23px;color:#fff;background:${meta.color};box-shadow:0 10px 18px -7px ${meta.color}88,inset 0 -4px 8px rgba(0,0,0,.15),inset 0 4px 7px rgba(255,255,255,.3)`)}>
          <Icon name={meta.icon} />
        </span>
        <div style={sx("flex:1;min-width:200px")}>
          <div style={sx("font-size:12.5px;font-weight:800;color:#8b9c97;letter-spacing:.4px")}>AI-АГЕНТИ В ТЕРМІНАЛІ</div>
          <h1 className="disp" style={sx("font-size:30px;font-weight:800;letter-spacing:-.6px")}>CLI — практика</h1>
        </div>
        <div style={sx("display:inline-flex;gap:5px;padding:5px;border-radius:16px;background:#dde6e2;box-shadow:inset 0 2px 5px rgba(17,74,68,.1)")}>
          {CLI_TOOLS.map((t) => {
            const on = tool === t.key;
            const seg = "display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border:none;cursor:pointer;border-radius:12px;font-weight:800;font-size:14px;transition:all .15s;";
            return (
              <button
                key={t.key}
                onClick={() => setTool(t.key)}
                style={sx(on ? seg + "color:#0d7d70;background:#fff;box-shadow:0 5px 11px -6px rgba(17,74,68,.28);" : seg + "color:#7d8f8a;background:transparent;")}
              >
                <Icon name={t.icon} /> {t.name}
              </button>
            );
          })}
        </div>
      </div>
      <p style={sx("margin:0 0 16px;color:#5b6d68;font-size:15px;line-height:1.55;text-wrap:pretty")}>
        Симуляція команд {meta.name}: slash-команди, режими дозволів, субагенти, робота з CLAUDE.md/AGENTS.md.
        Це навчальне середовище — реального агента не запускає. Набір команд оновлюється з файлу даних.
      </p>

      <div style={sx("height:min(76vh,860px);min-height:520px;border-radius:16px;overflow:hidden;box-shadow:0 20px 44px -20px rgba(17,74,68,.4)")}>
        <Terminal
          key={tool}
          backend={sim}
          account={account}
          seedLines={table.seed}
          promptFor={() => table.prompt}
          titleFor={() => table.title}
          complete={complete}
          historyKey={`cli-${tool}:${account}`}
        />
      </div>
    </main>
  );
}
