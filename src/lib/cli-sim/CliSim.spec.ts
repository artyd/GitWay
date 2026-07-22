import { describe, it, expect } from "vitest";
import { CliSim, SIM_TABLES } from "./index";

const text = (r: { lines: { text: string }[] }) => r.lines.map((l) => l.text).join("\n");

describe("CliSim — симулятор Claude Code", () => {
  it("/init створює проєктний документ (змінює стан)", () => {
    const sim = new CliSim(SIM_TABLES.claude);
    expect(sim.getState().hasProjectDoc).toBe(false);
    const r = sim.exec("/init");
    expect(text(r)).toContain("CLAUDE.md");
    expect(sim.getState().hasProjectDoc).toBe(true);
  });

  it("/clear повертає сентинел очищення", () => {
    const sim = new CliSim(SIM_TABLES.claude);
    const r = sim.exec("/clear");
    expect(r.lines).toEqual([{ text: "\x00CLEAR" }]);
  });

  it("/model змінює модель", () => {
    const sim = new CliSim(SIM_TABLES.claude);
    sim.exec("/model");
    expect(sim.getState().model).toBe("opus");
  });

  it("headless-режим підставляє аргумент", () => {
    const sim = new CliSim(SIM_TABLES.claude);
    const r = sim.exec('claude -p "виправ баг"');
    expect(text(r)).toContain("виправ баг");
  });

  it("невідома slash-команда → помилка; природна мова → план (fallback)", () => {
    const sim = new CliSim(SIM_TABLES.claude);
    expect(text(sim.exec("/nope"))).toContain("Невідома команда");
    const r = sim.exec("додай кнопку входу");
    expect(text(r)).toContain("додай кнопку входу"); // {{input}} у fallback
  });

  it("bump підвищує version і сповіщає підписників", () => {
    const sim = new CliSim(SIM_TABLES.claude);
    let calls = 0;
    const unsub = sim.subscribe(() => calls++);
    const v0 = sim.getVersion();
    sim.exec("/help");
    expect(sim.getVersion()).toBe(v0 + 1);
    expect(calls).toBe(1);
    unsub();
    sim.exec("/help");
    expect(calls).toBe(1); // після відписки більше не викликається
  });
});

describe("CliSim — симулятор Codex", () => {
  it("/approvals змінює рівень підтвердження", () => {
    const sim = new CliSim(SIM_TABLES.codex);
    sim.exec("/approvals");
    expect(sim.getState().approvals).toBe("auto-edit");
  });
  it("codex exec виконує headless-задачу", () => {
    const sim = new CliSim(SIM_TABLES.codex);
    expect(text(sim.exec('codex exec "онови залежності"'))).toContain("онови залежності");
  });
});
