// Рендер уроку «Робота з AI-помічником на сервері»: node render-server.mjs
// Виводить у public/videos/server-assistant.mp4 (перезаписує наявний).

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const OUT_NAME = "server-assistant.mp4";
const out = path.resolve(__dirname, "../public/videos", OUT_NAME);

console.log(`Бандлимо для ServerAssistant → ${OUT_NAME}…`);
const serveUrl = await bundle({ entryPoint: path.join(__dirname, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "ServerAssistant", inputProps: {}, browserExecutable: CHROME });
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
  onProgress: ({ progress }) => process.stdout.write(`\rServerAssistant → ${OUT_NAME}  ${(progress * 100).toFixed(0)}%   `),
});
console.log(`\n✓ ${OUT_NAME}  (${composition.durationInFrames} кадрів, ${((Date.now() - t0) / 1000).toFixed(0)}с)`);
