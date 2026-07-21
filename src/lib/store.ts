import { promises as fs } from "fs";
import path from "path";

export interface ProfileProgress {
  completedModules: string[];
  quizScores: Record<string, number>;
  updatedAt: string;
}

const DATA_FILE = path.join(process.cwd(), "data", "progress.json");

type Store = Record<string, ProfileProgress>;

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

async function writeStore(store: Store) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * ЛОКАЛЬНЕ сховище на файлі — годиться для розробки й для прев'ю.
 *
 * На Vercel файлова система serverless-функцій ephemeral (не зберігається
 * між запитами), тому перед реальним деплоєм з кількома людьми потрібно
 * замінити ці дві функції на виклики @upstash/redis (підключається як
 * Marketplace Storage у панелі Vercel — без окремої реєстрації).
 * Сигнатури функцій навмисно однакові, щоб решта коду не змінювалась.
 */
export async function getProgress(profile: string): Promise<ProfileProgress> {
  const store = await readStore();
  return (
    store[profile] ?? {
      completedModules: [],
      quizScores: {},
      updatedAt: new Date().toISOString(),
    }
  );
}

export async function saveModuleComplete(
  profile: string,
  moduleSlug: string,
  quizScore?: number
): Promise<ProfileProgress> {
  const store = await readStore();
  const current = store[profile] ?? {
    completedModules: [],
    quizScores: {},
    updatedAt: new Date().toISOString(),
  };

  if (!current.completedModules.includes(moduleSlug)) {
    current.completedModules.push(moduleSlug);
  }
  if (typeof quizScore === "number") {
    current.quizScores[moduleSlug] = quizScore;
  }
  current.updatedAt = new Date().toISOString();

  store[profile] = current;
  await writeStore(store);
  return current;
}
