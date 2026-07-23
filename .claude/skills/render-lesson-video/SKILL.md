---
name: render-lesson-video
description: Відрендерити відео-урок GitШлях через Remotion у public/videos. Використовуй, коли треба згенерувати або перегенерувати ролик уроку (id 2–35), відкрити студію прев'ю Remotion, або розібратися чому рендер падає (кирилиця в шляху / headless-Chrome).
---

# Рендер відео-уроків (Remotion)

Відео живуть у `remotion/` (окремий пакет). Кожен урок — композиція `RichLesson<id>`; готовий MP4 лягає в `public/videos/` і показується на сторінці уроку.

## Рендер одного уроку (канонічний шлях)

`render-rich.mjs` уже вказує на встановлений Chrome і сам обчислює правильне імʼя файлу — це найнадійніший спосіб:

```powershell
cd remotion
node render-rich.mjs <id>      # id = 2..35
```

Мапа вихідних імен (робить сам скрипт):
- `2–11`  → `public/videos/lesson-XX-sound.mp4` (Git-уроки)
- `12–23` → `public/videos/claude-XX.mp4` (Claude, XX = id−11)
- `24–35` → `public/videos/codex-XX.mp4` (Codex, XX = id−23)

`render-rich.mjs` використовує `C:\Program Files\Google\Chrome\Application\chrome.exe`. Якщо Chrome встановлено інакше — онови константу `CHROME` у скрипті.

## Студія прев'ю

```powershell
cd remotion
npm install        # перший раз
npm run studio     # редактор Remotion у браузері
```

## Пакетний рендер

Пройдись циклом по потрібних id:

```powershell
cd remotion
foreach ($i in 12..23) { node render-rich.mjs $i }
```

## Відома пастка: кирилиця в шляху

Remotion **не розпаковує** headless-Chrome, коли у шляху проєкту є кирилиця (`C:\Projects\Артем\…`) на нових Node. `render-rich.mjs` це обходить, бо передає шлях до **звичайного** Chrome явно. Якщо все ж падає на браузері — або встанови/вкажи Chrome через `CHROME`, або рендери з ASCII-шляху за інструкцією в `remotion/README.md` (robocopy у `C:\gitway-remotion`, ручний `Expand-Archive` chrome-headless-shell, `--browser-executable=…`).

## Контент відео

Композиції беруть дані з `remotion/src/`. Якщо оновив урок у `src/content/lessons/*.json`, синхронізуй джерело відео за `remotion/README.md` перед рендером, інакше ролик покаже старий контент.

## Після рендеру

Переконайся, що поле `video` відповідного уроку вказує на новий файл, і перевір сторінку уроку через скіл **run-dev**.
