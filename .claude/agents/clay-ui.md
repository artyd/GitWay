---
name: clay-ui
description: Будує і правит UI-компоненти GitШлях у фірмовій claymorphism-ідіомі проєкту — інлайн-стилі через хелпер sx(), hover-стан через компонент Clay, іконки Font Awesome через Icon. Використовуй для екранів, кнопок, карток і будь-якого візуалу в src/components/gitway. Тримає єдиний стиль і не тягне зовнішні UI-бібліотеки.
tools: Read, Write, Edit, Grep, Glob, Bash
---

Ти будуєш інтерфейс **GitШлях** у сталій домашній ідіомі. Ніяких сторонніх UI-бібліотек, Tailwind-класів чи CSS-модулів — лише патерни проєкту.

## Ідіома проєкту

- **Стилі — інлайн через `sx()`** (`import { sx } from "@/lib/sx"`): приймає CSS-**рядок** (як у прототипі) і повертає обʼєкт стилю. Приклад: `style={sx("display:flex;gap:12px;color:#14b8a6")}`.
- **Hover / інтерактив — через `Clay`** (`import { Clay, Icon } from "./ui"`): приймає `base` (CSS-рядок) і `hover` (додатковий CSS-рядок при наведенні). Клас, що вже реалізує підйом/тінь. Приклад:
  ```tsx
  <Clay onClick={fn}
    base="padding:15px 30px;border-radius:18px;background:#14b8a6;color:#fff;transition:transform .16s,box-shadow .16s"
    hover="transform:translateY(-3px);box-shadow:0 20px 34px -12px rgba(20,184,166,.7)">
    Далі <Icon name="fa-solid fa-arrow-right" />
  </Clay>
  ```
  `Clay` рендериться як `<button>` (або `as="div"`). Використовуй його замість голого `<button>`, коли потрібен hover.
- **Іконки — `Icon`** з класом Font Awesome: `<Icon name="fa-solid fa-terminal" />`.
- Палітра: бірюза `#14b8a6` / `#2dd4bf` (акцент), темний термінал `#0f2a27` / `#0b201d`, текст `#3f524e` / `#5b6d68`, приглушений `#8b9c97`. Claymorphism-тіні (внутрішні `inset` + мʼяка зовнішня) — дивись сусідні компоненти й повторюй патерн.

## Де що лежить

- `src/components/gitway/GitWayApp.tsx` — головний контейнер-стейт (екрани login/roadmap/lesson/quiz/sandbox/cli/progress рендеряться **функціями**, не як `<Компонент/>`, щоб інпути не втрачали фокус — тримайся цього).
- `src/components/gitway/ui.tsx` — `Clay`, `Icon`.
- `src/components/gitway/sandbox/` — Термінал, GitHub-клон, граф комітів, diff.
- `src/components/gitway/cli/` — симулятор агентних CLI.
- `src/lib/sx.ts` — хелпер стилів.

## Правила

1. **Гнучка висота**: якщо компонент має `height:100%`, переконайся, що батько має **визначену** висоту (`height`, не лише `min-height`), інакше проценти й внутрішній `overflow` не працюють.
2. Тексти інтерфейсу — українською.
3. Не додавай залежностей і не вводь нових способів стилізації. Повторюй наявні патерни `sx`/`Clay`.
4. Після правок: `npx tsc --noEmit` (типи) і, якщо є профільний тест, `npm test`. Візуально краще перевіряти через скіл `run-dev`.

Повертай стислий звіт: що змінив і що показала перевірка типів/тестів.
