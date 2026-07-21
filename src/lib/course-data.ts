export type PhaseKey = "basics" | "github" | "agents";

export interface Phase {
  key: PhaseKey;
  title: string;
  subtitle: string;
  color: "teal" | "blue" | "amber";
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ModuleSection {
  heading: string;
  body: string;
}

export interface Sandbox {
  title: string;
  description: string;
  steps: { label: string; result: string }[];
}

export interface CourseModule {
  slug: string;
  order: number;
  phase: PhaseKey;
  title: string;
  shortLabel: string;
  icon: string;
  duration: string;
  isReady: boolean;
  teaser: string;
  analogy?: string;
  intro?: string;
  sections?: ModuleSection[];
  sandbox?: Sandbox;
  quiz?: QuizQuestion[];
}

export const phases: Phase[] = [
  {
    key: "basics",
    title: "Фаза 1 — Основи Git",
    subtitle: "Перші кроки без страху",
    color: "teal",
  },
  {
    key: "github",
    title: "Фаза 2 — GitHub і команда",
    subtitle: "Задачі, ревʼю, безпека",
    color: "blue",
  },
  {
    key: "agents",
    title: "Фаза 3 — Робота з AI-агентами",
    subtitle: "Claude Code та Codex у справі",
    color: "amber",
  },
];

export const modules: CourseModule[] = [
  {
    slug: "shcho-take-git",
    order: 1,
    phase: "basics",
    title: "Що таке Git?",
    shortLabel: "Що це?",
    icon: "git-alt",
    duration: "7 хв",
    isReady: true,
    teaser: "Аналогія Git",
    analogy:
      "Уяви, що Git — це машина часу для твоїх файлів. Кожного разу, коли ти зберігаєш «знімок» роботи, машина часу запамʼятовує, як усе виглядало саме зараз. Помилився, видалив щось важливе, хочеш подивитись, що було вчора? Просто перемотуєш назад — і все на місці.",
    intro:
      "Git — це не сайт і не кнопка. Це програма, яка встановлюється на комп'ютер і тихо запам'ятовує історію змін твоїх файлів. GitHub — це вже інша річ: сайт, де ці історії зберігаються онлайн і ними можна ділитися з командою. Про GitHub поговоримо у фазі 2, а зараз — тільки про сам Git.",
    sections: [
      {
        heading: "Навіщо це керівнику відділу",
        body: "Ти особисто можеш ніколи не писати код. Але команда, задачі та документи проєкту будуть жити саме в Git-репозиторії. Розуміючи базові поняття, ти зможеш дивитись історію проєкту, розуміти, що і коли змінилось, і ставити задачі так, щоб команда та AI-агенти розуміли тебе з півслова.",
      },
      {
        heading: "Три головні слова",
        body: "Репозиторій (repository) — це та сама «папка з машиною часу», проєкт цілком. Коміт (commit) — один «знімок» змін, збережений з коротким описом. Гілка (branch) — паралельна версія проєкту, де можна пробувати щось нове, не чіпаючи основну, стабільну версію.",
      },
      {
        heading: "Як це виглядає на практиці",
        body: "Хтось із команди змінює файл → зберігає це як коміт з описом «додав розділ про ціни» → історія поповнюється новим записом. За тиждень таких записів може бути тридцять, і кожен з них — це маленька, підписана дата в машині часу проєкту.",
      },
    ],
    sandbox: {
      title: "Спробуй сам: перший коміт",
      description:
        "Це безпечна пісочниця — тут неможливо нічого зламати. Пройди три кроки і подивись, як виглядає коміт зсередини.",
      steps: [
        {
          label: "Змінити файл README.md",
          result: "Файл позначено як змінений — Git побачив різницю.",
        },
        {
          label: "Додати зміну до коміту",
          result: "Зміну підготовлено до збереження в історію.",
        },
        {
          label: 'Зберегти коміт з описом "оновив опис проєкту"',
          result:
            "Готово! Новий запис зʼявився в історії проєкту — його завжди можна знайти й переглянути.",
        },
      ],
    },
    quiz: [
      {
        question: "Що таке репозиторій?",
        options: [
          "Один файл у проєкті",
          "Проєкт цілком, з усією історією змін",
          "Помилка в коді",
          "Акаунт користувача",
        ],
        correctIndex: 1,
        explanation:
          "Репозиторій — це весь проєкт разом з машиною часу його змін.",
      },
      {
        question: "Коміт — це...",
        options: [
          "Видалення файлу назавжди",
          "Назва компанії",
          "Один збережений «знімок» змін з описом",
          "Гілка проєкту",
        ],
        correctIndex: 2,
        explanation: "Коміт фіксує стан проєкту в конкретний момент часу.",
      },
      {
        question: "Навіщо потрібна гілка (branch)?",
        options: [
          "Щоб видалити проєкт",
          "Щоб пробувати нове, не чіпаючи стабільну версію",
          "Щоб змінити пароль",
          "Це просто інша назва репозиторію",
        ],
        correctIndex: 1,
        explanation:
          "Гілка дозволяє експериментувати паралельно, не ризикуючи основною версією.",
      },
    ],
  },
  {
    slug: "vstanovlennya",
    order: 2,
    phase: "basics",
    title: "Встановлення інструментів",
    shortLabel: "Встановлення",
    icon: "download",
    duration: "10 хв",
    isReady: false,
    teaser: "Git, термінал, VS Code — покроково для Windows і Mac",
  },
  {
    slug: "terminal",
    order: 3,
    phase: "basics",
    title: "Перші кроки в терміналі",
    shortLabel: "Термінал",
    icon: "terminal",
    duration: "8 хв",
    isReady: false,
    teaser: "5-6 базових команд, без страху перед чорним вікном",
  },
  {
    slug: "komit-i-hilka",
    order: 4,
    phase: "basics",
    title: "Коміт і гілка",
    shortLabel: "Коміт",
    icon: "code-branch",
    duration: "9 хв",
    isReady: false,
    teaser: "Інтерактивна пісочниця з гілками та історією",
  },
  {
    slug: "github-osnovy",
    order: 5,
    phase: "github",
    title: "GitHub: акаунт і репозиторій",
    shortLabel: "GitHub",
    icon: "github",
    duration: "8 хв",
    isReady: false,
    teaser: "Створюємо перший репозиторій онлайн",
  },
  {
    slug: "issues-projects",
    order: 6,
    phase: "github",
    title: "Issues та Projects",
    shortLabel: "Issues",
    icon: "list-check",
    duration: "10 хв",
    isReady: false,
    teaser: "Як ставити й вести задачі команди",
  },
  {
    slug: "pull-request",
    order: 7,
    phase: "github",
    title: "Pull Request і рев'ю",
    shortLabel: "Pull Request",
    icon: "code-pull-request",
    duration: "10 хв",
    isReady: false,
    teaser: "Хто мержить, хто ревʼюить, політики гілок",
  },
  {
    slug: "bezpeka",
    order: 8,
    phase: "github",
    title: "Безпека: SSH та токени",
    shortLabel: "Безпека",
    icon: "shield-halved",
    duration: "9 хв",
    isReady: false,
    teaser: "SSH-ключі та Personal Access Token простими словами",
  },
  {
    slug: "pidklyuchennya-agenta",
    order: 9,
    phase: "agents",
    title: "Підключення AI-агента",
    shortLabel: "Підключення",
    icon: "robot",
    duration: "10 хв",
    isReady: false,
    teaser: "Встановлюємо і авторизуємо Claude Code або Codex CLI",
  },
  {
    slug: "persha-zadacha",
    order: 10,
    phase: "agents",
    title: "Перше завдання агенту",
    shortLabel: "Перша задача",
    icon: "wand-magic-sparkles",
    duration: "8 хв",
    isReady: false,
    teaser: "Даємо агенту першу просту команду",
  },
  {
    slug: "povnyy-tsykl",
    order: 11,
    phase: "agents",
    title: "Повний цикл: від задачі до звіту",
    shortLabel: "Повний цикл",
    icon: "flag-checkered",
    duration: "12 хв",
    isReady: false,
    teaser: "Задача → робота агента → Pull Request → звіт директору",
  },
];

export function getModule(slug: string) {
  return modules.find((m) => m.slug === slug);
}

export function getPhase(key: PhaseKey) {
  return phases.find((p) => p.key === key)!;
}

export function modulesByPhase(key: PhaseKey) {
  return modules.filter((m) => m.phase === key).sort((a, b) => a.order - b.order);
}
