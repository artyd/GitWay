// Стартовий робочий простір: репозиторій marketing-plan з початковими комітами,
// щоб пісочниця не була порожньою при першому вході.

import { HOME, type Workspace } from "./types";
import { freshWorkspace } from "./workspace";
import { dispatch } from "./commands";
import * as P from "./path";

/**
 * Створює демо-репозиторій, проганяючи справжні команди рушія — тож стан
 * узгоджений із тим, що згенерував би користувач вручну.
 */
export function createSeedWorkspace(account: string, clock: () => number): Workspace {
  const ws = freshWorkspace(account);
  const run = (line: string) => dispatch(ws, line, clock);

  const repoDir = P.join(HOME, "marketing-plan");
  ws.looseDirs.push(repoDir);
  ws.cwd = repoDir;
  run("git init");
  run('git config user.name "Команда маркетингу"');
  run('git config user.email "team@gitway.local"');

  run('echo "# План маркетингу 2026" > README.md');
  run('echo "Наш план просування продукту на новий рік." >> README.md');
  run("mkdir docs");
  run('echo "Ідея 1: запуск відеокурсу\\nІдея 2: партнерські вебінари" > docs/ideas.md');
  run("git add .");
  run('git commit -m "Початковий план і структура"');

  run('echo "Бюджет Q1: 120 000 грн" > docs/budget.md');
  run("git add docs/budget.md");
  run('git commit -m "Додаю бюджет на перший квартал"');

  ws.currentRepoId = firstRepoId(ws);
  return ws;
}

function firstRepoId(ws: Workspace): string | null {
  const ids = Object.keys(ws.repos);
  return ids.length ? ids[0] : null;
}
