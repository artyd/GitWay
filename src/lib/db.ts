// Серверний доступ до Postgres (лише на сервері — цей модуль не імпортувати в клієнт).
// Зберігає прогрес усіх учасників, щоб рейтинг був спільним, а не в памʼяті браузера.
import "server-only";
import { Pool } from "pg";

export type ProgressRow = {
  userId: string;
  name: string;
  department: string;
  deptKey: string;
  completed: number[];
  current: number;
  xp: number;
  streak: number;
  trKnown: string[];
};

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL не задано — вкажіть рядок підключення до Postgres");
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS progress (
          user_id     text PRIMARY KEY,
          name        text NOT NULL,
          department  text NOT NULL,
          dept_key    text NOT NULL,
          completed   jsonb NOT NULL DEFAULT '[]',
          current     integer NOT NULL DEFAULT 1,
          xp          integer NOT NULL DEFAULT 0,
          streak      integer NOT NULL DEFAULT 0,
          tr_known    jsonb NOT NULL DEFAULT '[]',
          updated_at  timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS progress_xp_idx ON progress (xp DESC);
        CREATE INDEX IF NOT EXISTS progress_dept_idx ON progress (dept_key);
      `)
      .then(() => undefined)
      .catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

function mapRow(r: Record<string, unknown>): ProgressRow {
  return {
    userId: r.user_id as string,
    name: r.name as string,
    department: r.department as string,
    deptKey: r.dept_key as string,
    completed: (r.completed as number[]) ?? [],
    current: (r.current as number) ?? 1,
    xp: (r.xp as number) ?? 0,
    streak: (r.streak as number) ?? 0,
    trKnown: (r.tr_known as string[]) ?? [],
  };
}

export async function getProgress(userId: string): Promise<ProgressRow | null> {
  await ensureSchema();
  const { rows } = await getPool().query("SELECT * FROM progress WHERE user_id = $1", [userId]);
  return rows.length ? mapRow(rows[0]) : null;
}

export async function upsertProgress(p: ProgressRow): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO progress (user_id, name, department, dept_key, completed, current, xp, streak, tr_known, updated_at)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb, now())
     ON CONFLICT (user_id) DO UPDATE SET
       name = EXCLUDED.name, department = EXCLUDED.department, dept_key = EXCLUDED.dept_key,
       completed = EXCLUDED.completed, current = EXCLUDED.current, xp = EXCLUDED.xp,
       streak = EXCLUDED.streak, tr_known = EXCLUDED.tr_known, updated_at = now()`,
    [
      p.userId, p.name, p.department, p.deptKey,
      JSON.stringify(p.completed ?? []), p.current ?? 1, p.xp ?? 0, p.streak ?? 0,
      JSON.stringify(p.trKnown ?? []),
    ],
  );
}

export type LbRow = { userId: string; name: string; department: string; deptKey: string; xp: number };

// Топ-N за XP (для дефолтного рейтингу без фільтрів).
export async function topProgress(limit: number): Promise<LbRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query(
    "SELECT user_id, name, department, dept_key, xp FROM progress ORDER BY xp DESC, updated_at ASC LIMIT $1",
    [limit],
  );
  return rows.map((r) => ({ userId: r.user_id, name: r.name, department: r.department, deptKey: r.dept_key, xp: r.xp }));
}

// XP усіх учасників обраного відділу, хто вже почав (решту доповнює роестр нулями у route).
export async function progressByDept(deptKey: string): Promise<LbRow[]> {
  await ensureSchema();
  const { rows } = await getPool().query(
    "SELECT user_id, name, department, dept_key, xp FROM progress WHERE dept_key = $1",
    [deptKey],
  );
  return rows.map((r) => ({ userId: r.user_id, name: r.name, department: r.department, deptKey: r.dept_key, xp: r.xp }));
}

// Місце учасника в загальному рейтингу (1 = найбільше XP). null, якщо ще нема прогресу.
export async function rankOf(userId: string): Promise<number | null> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT (SELECT count(*) FROM progress p2 WHERE p2.xp > p1.xp) + 1 AS rank
     FROM progress p1 WHERE p1.user_id = $1`,
    [userId],
  );
  return rows.length ? Number(rows[0].rank) : null;
}
