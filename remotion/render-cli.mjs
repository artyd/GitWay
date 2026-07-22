// Рендер відео CLI-курсів: бандлимо один раз і рендеримо всі уроки (або задані).
// Використовує системний Chrome (Headless Shell не завантажується в цьому середовищі).
// Запуск: node render-cli.mjs           — усі 24
//         node render-cli.mjs 12 24      — лише вказані id

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const lessons = JSON.parse(readFileSync(path.join(__dirname, "src/cli-lessons.json"), "utf8"));
const only = process.argv.slice(2).map(Number);
const targets = only.length ? lessons.filter((l) => only.includes(l.id)) : lessons;

const outDir = path.resolve(__dirname, "../public/videos");

console.log("Бандлимо проєкт…");
const serveUrl = await bundle({ entryPoint: path.join(__dirname, "src/index.ts") });

let done = 0;
for (const l of targets) {
  const id = `CliLesson${l.id}`;
  const base = l.audio.split("/").pop().replace(/\.mp3$/, ""); // claude-01
  const out = path.join(outDir, `${base}.mp4`);
  // відновлюваність: пропускаємо вже відрендерене (>200 КБ)
  if (existsSync(out) && statSync(out).size > 200_000) {
    done++;
    console.log(`↷ ${base}.mp4 вже є — пропускаю`);
    continue;
  }
  const composition = await selectComposition({ serveUrl, id, inputProps: {}, browserExecutable: CHROME });
  const t0 = Date.now();
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: out,
    browserExecutable: CHROME,
    inputProps: {},
    scale: 2 / 3, // рендеримо дизайн 1920×1080 у 1280×720 — швидше, якість ок
    concurrency: 4,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r[${done + 1}/${targets.length}] ${base}.mp4  ${(progress * 100).toFixed(0)}%   `);
    },
  });
  done++;
  console.log(`\n✓ ${base}.mp4  (${composition.durationInFrames} кадрів, ${((Date.now() - t0) / 1000).toFixed(0)}с)`);
}
console.log(`\nГотово: ${done}/${targets.length} відео у public/videos.`);
