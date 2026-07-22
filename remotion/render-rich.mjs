// Рендер ОДНОГО багатого відео уроку: node render-rich.mjs <id>
// Виводить у правильний файл застосунку (перезаписує наявний).

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const pad = (n) => String(n).padStart(2, "0");

const id = Number(process.argv[2]);
if (!id || id < 2 || id > 35) {
  console.error("Вкажіть id уроку 2..35");
  process.exit(1);
}

function outName(id) {
  if (id <= 11) return `lesson-${pad(id)}-sound.mp4`; // Git-уроки
  if (id <= 23) return `claude-${pad(id - 11)}.mp4`; // Claude
  return `codex-${pad(id - 23)}.mp4`; // Codex
}

const out = path.resolve(__dirname, "../public/videos", outName(id));
console.log(`Бандлимо для RichLesson${id} → ${outName(id)}…`);
const serveUrl = await bundle({ entryPoint: path.join(__dirname, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: `RichLesson${id}`, inputProps: {}, browserExecutable: CHROME });
const t0 = Date.now();
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: out,
  browserExecutable: CHROME,
  scale: 2 / 3,
  concurrency: 4,
  inputProps: {},
  onProgress: ({ progress }) => process.stdout.write(`\rRichLesson${id} → ${outName(id)}  ${(progress * 100).toFixed(0)}%   `),
});
console.log(`\n✓ ${outName(id)}  (${composition.durationInFrames} кадрів, ${((Date.now() - t0) / 1000).toFixed(0)}с)`);
