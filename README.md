# GitШлях

Курс з нуля: Git, GitHub і робота з AI-агентами (Claude Code, Codex CLI) —
для керівників відділів без технічного бекграунду. Українською, без жаргону.

## Стек

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** — дизайн-токени в `src/app/globals.css` (Claymorphism,
  світла тема, кольори по фазах курсу: teal / blue / amber)
- **motion** — анімації
- **Font Awesome** — іконки
- Шрифти: **Unbounded** (заголовки) + **Golos Text** (текст), обидва з
  підтримкою кирилиці

## Запуск локально

```bash
npm install
npm run dev
```

Відкрити http://localhost:3000

## Структура проєкту

Застосунок — це односторінковий клієнтський SPA (машина екранів у `GitWayApp.tsx`),
прогрес зберігається в `localStorage` окремо для кожного акаунта-відділу.

```
src/
  app/
    page.tsx                     # рендерить <GitWayApp/>
    layout.tsx, globals.css      # оболонка, шрифти, стилі
  components/gitway/
    GitWayApp.tsx                # весь застосунок: вхід, дорожня карта, уроки, квіз, прогрес
    ui.tsx, AudioPlayer.tsx      # презентаційні компоненти
    sandbox/                     # ВКЛАДКА «ПІСОЧНИЦЯ» (термінал + клон GitHub)
      SandboxPanel.tsx           #   двоколонковий контейнер + вибір сценарію уроку
      Terminal.tsx               #   інтерактивний термінал
      GitHubClone.tsx            #   репо/гілки/коміти/PR/файли/staging
      DiffView.tsx, CommitGraph.tsx
  lib/
    gitway-data.ts               # ВЕСЬ контент: LESSONS[11], CMDS, фази, бейджі
    sx.ts                        # парсер інлайн-CSS -> React.CSSProperties
    git-engine/                  # КЛІЄНТСЬКИЙ GIT-РУШІЙ (див. нижче)
```

## Пісочниця — клієнтський Git-рушій

Вкладка **Пісочниця** (поряд із «Тренажером») дає справжню практику Git без
жодного бекенду. Реальний **термінал** і **клон GitHub** працюють на одній
спільній моделі даних, тож дії в одному місці одразу видно в іншому.

- `src/lib/git-engine/` — самодостатній, серіалізовний у JSON, незалежний від
  React рушій: контент-адресовані обʼєкти, індекс (staging), гілки, злиття
  (fast-forward і три-стороннє з конфліктами), diff (LCS), stash, віддалені
  репо (`clone`/`push`/`pull` у межах браузера), pull request'и.
- Термінал підтримує `cd, ls, pwd, mkdir, rm, touch, cat, echo, mv, cp` та
  `git init/add/commit/status/log/diff/branch/checkout/switch/merge/rebase/stash/remote/push/pull/clone`,
  історію команд (↑/↓), Tab-доповнення, `Ctrl+C`/`Ctrl+L`.
- Стан пісочниці зберігається в `localStorage` (`gitway:sandbox:v1:<акаунт>`).
- Єдиний оракул `computeStatus()` живить і `git status` у терміналі, і панель
  staging у GitHub-UI — вони не можуть розійтися.

## Тести

```bash
npm test           # Vitest: рушій (одиничні) + компоненти пісочниці (jsdom)
npm run test:watch
```

## Як додати новий урок

Урок 1 (`shcho-take-git`) у `src/lib/course-data.ts` — повний приклад.
Щоб наповнити решту, для кожного модуля потрібно додати (і поставити
`isReady: true`):

- `analogy` — просте порівняння без термінів
- `intro` + `sections` — теорія
- `sandbox` — покрокова інтерактивна вправа (компонент `Sandbox` вже готовий)
- `quiz` — 3-5 питань з поясненням відповіді

Нічого іншого чіпати не треба — сторінка уроку сама підхопить контент за `slug`.

## Прогрес користувачів

Зараз прогрес пишеться в локальний файл `data/progress.json` (у
`.gitignore`, для розробки). **Перед реальним використанням кількома
людьми** потрібно замінити сховище в `src/lib/store.ts` на Redis:

1. У проєкті на Vercel → вкладка **Storage** → **Create Database** →
   **Redis** (Upstash). Окремо реєструватись ніде не треба.
2. `npm install @upstash/redis`
3. У `src/lib/store.ts` замінити читання/запис файлу на виклики
   `Redis.fromEnv()` — сигнатури функцій `getProgress` / `saveModuleComplete`
   міняти не треба, тільки їх реалізацію.

## Деплой

Git-репозиторій вже ініціалізовано і перший коміт зроблено. Залишилось
підключити ваш GitHub-репозиторій і запушити:

```bash
git remote add origin <URL_ВАШОГО_РЕПОЗИТОРІЮ>
git push -u origin main
```

Далі на [vercel.com](https://vercel.com) → **Add New Project** → обрати цей
репозиторій → Deploy. Змінних середовища на старті не потрібно (зʼявляться
автоматично, коли підключите Redis у Storage).

## Далі в планах

- Наповнити уроки 2–11 (структура вже готова, потрібен тільки контент)
- Відео до уроків — через HyperFrames або Remotion (озвучка — власним голосом)
- Замінити файлове сховище на Redis перед реальним запуском
