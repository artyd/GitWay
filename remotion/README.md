# GitШлях — відео-уроки (Remotion)

Тут живуть відео до уроків. Кожен урок — окрема композиція в `src/`.
Готове відео рендериться в `../public/videos/` і показується на сторінці уроку
(поле `video` в `src/lib/gitway-data.ts`).

## Композиції

- **Уроки 2–11** — генеруються автоматично з даних (`src/lessons.json`) однією
  універсальною композицією `LessonVideo` (`src/LessonVideo.tsx`, спільні стилі —
  `src/common.tsx`). Сцени будуються з контенту уроку: інтро → аналогія → секції
  теорії → пісочниця (кроки) → фінал. Поки без звуку — озвучку можна додати
  згодом, як для уроку 1. Тривалість кожного ролика рахується з обсягу контенту
  (`lessonDuration`).
- `Lesson1` (`src/Lesson1.tsx`) — відео до уроку 1 «Що таке Git?»,
  1920×1080, 30 fps, ~101.5 c, **з озвучкою** (`public/audio/lesson-01.mp3`,
  вбудована через `<Audio>`). Сцени: інтро → аналогія (машина часу) →
  навіщо керівнику → три поняття → крок-за-кроком коміт → фінал. Стиль —
  claymorphism сайту, шрифт Nunito (кирилиця), іконки — SVG (без емодзі).
  Тривалість підігнана під довжину озвучки (`SCENES` у `Lesson1.tsx`).

## Прев'ю у студії

```bash
cd remotion
npm install
npm run studio        # http://localhost:3000 — редактор Remotion
```

## Рендер у MP4

> ⚠️ Важливо: Remotion не вміє розпакувати headless-Chrome, коли у шляху до
> проєкту є кирилиця (`C:\Projects\Артем\...`) + Node 26. Тому рендеримо з
> ASCII-шляху. Один раз налаштувати:

```powershell
# 1. Скопіювати проєкт у ASCII-шлях і встановити залежності
robocopy C:\Projects\Артем\GitWay\remotion C:\gitway-remotion /E /XD node_modules
cd C:\gitway-remotion; npm install

# 2. Розпакувати браузер вручну (Remotion качає zip, але не розпаковує)
#    zip лежить у node_modules\.remotion\chrome-headless-shell\*.zip
Expand-Archive node_modules\.remotion\chrome-headless-shell\chrome-headless-shell-win64.zip chrome -Force
```

Далі рендер (шлях до браузера передаємо явно):

```powershell
cd C:\gitway-remotion
npx remotion render src/index.ts Lesson1 out/lesson-01.mp4 `
  --browser-executable="C:\gitway-remotion\chrome\chrome-headless-shell-win64\chrome-headless-shell.exe"

# скопіювати готове відео в проєкт
copy out\lesson-01.mp4 "C:\Projects\Артем\GitWay\public\videos\lesson-01-final.mp4"
```

### Рендер усіх уроків 2–11 (пакетно)

```powershell
cd C:\gitway-remotion
$chrome = "C:\gitway-remotion\chrome\chrome-headless-shell-win64\chrome-headless-shell.exe"
foreach ($i in 2..11) {
  $n = "lesson-" + $i.ToString("00") + ".mp4"
  npx remotion render src/index.ts "Lesson$i" "out/$n" --browser-executable="$chrome"
  copy "out\$n" "C:\Projects\Артем\GitWay\public\videos\$n"
}
```

> Перед рендером синхронізуй свіжі `src/*` у `C:\gitway-remotion\src` і онови
> `src/lessons.json` (копія з даних курсу).

## Додати озвучку/оновити контент уроку

- Контент береться з `src/lessons.json` — онови його з даних курсу і перерендери.
- Мапа `VIDEOS` у генераторі даних (`scratchpad/gen-data.mjs`) звʼязує урок із
  файлом у `public/videos/` (лишається запустити `node gen-data.mjs`).

## Озвучка

Урок 1 вже озвучений: `public/audio/lesson-01.mp3` вбудовано в композицію через
`<Audio src={staticFile("audio/lesson-01.mp3")} />`. Той самий файл лежить у
`../public/audio/` і програється окремим плеєром на сторінці уроку
(`AudioPlayer`, поле `audio` в даних уроку).

Щоб замінити/додати озвучку іншому уроку:

- покласти mp3 у `remotion/public/audio/` (для рендеру) і в `../public/audio/` (для сайту);
- у композиції додати `<Audio src={staticFile("audio/lesson-0X.mp3")} />`;
- підігнати `SCENES` під тривалість аудіо (`ffprobe -show_entries format=duration`);
- (опційно) авто-субтитри через `@remotion/install-whisper-cpp`.
