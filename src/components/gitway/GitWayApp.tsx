"use client";

import { useEffect, useState } from "react";
import { sx } from "@/lib/sx";
import { Clay, Icon } from "./ui";
import { AudioPlayer } from "./AudioPlayer";
import { SandboxPanel } from "./sandbox/SandboxPanel";
import { CliPanel } from "./cli/CliPanel";
import { LessonContent } from "./LessonContent";
import { GitEngine } from "@/lib/git-engine/store";
import { loadWorkspace } from "@/lib/git-engine/persistence";
import { createSeedWorkspace } from "@/lib/git-engine/seed";
import {
  BADGE_DEFS,
  CAT_META,
  CAT_ORDER,
  CMDS,
  LESSONS,
  PHASE_IDS,
  PHASE_META,
  TOTAL_LESSONS,
  type Command,
  type Lesson,
} from "@/lib/gitway-data";
import { matchesAccept } from "@/lib/content/matchCommand";

type Screen = "login" | "roadmap" | "trainer" | "sandbox" | "cli" | "lesson" | "quiz" | "progress";
type TrMode = "cards" | "spell" | "ref";

// 9 акаунтів-відділів. Прогрес кожного зберігається окремо (localStorage).
type Account = { key: string; name: string; role: string; initials: string; color: string; icon: string };

const ACCOUNTS: Account[] = [
  { key: "zakupivli", name: "Відділ закупівель", role: "Постачання та закупівлі", icon: "fa-solid fa-cart-shopping", color: "#e6a15a", initials: "ВЗ" },
  { key: "prodazhi", name: "Відділ продажів", role: "Продажі та клієнти", icon: "fa-solid fa-handshake", color: "#14b8a6", initials: "ВП" },
  { key: "it", name: "Відділ ІТ", role: "Технічний відділ", icon: "fa-solid fa-laptop-code", color: "#7c6ee0", initials: "ІТ" },
  { key: "finance", name: "Фінансовий відділ", role: "Фінанси та бюджет", icon: "fa-solid fa-coins", color: "#3fae7a", initials: "ФВ" },
  { key: "legal", name: "Юридичний відділ", role: "Право та договори", icon: "fa-solid fa-scale-balanced", color: "#5b76c9", initials: "ЮВ" },
  { key: "equipment", name: "Відділ обладнання", role: "Техніка та обладнання", icon: "fa-solid fa-screwdriver-wrench", color: "#b5793a", initials: "ВО" },
  { key: "hr", name: "Відділ персоналу", role: "Кадри та персонал", icon: "fa-solid fa-users", color: "#cf6a9c", initials: "Пе" },
  { key: "director", name: "Директор", role: "Керівництво", icon: "fa-solid fa-user-tie", color: "#e0a03e", initials: "Ди" },
  { key: "test", name: "Тест", role: "Тестовий акаунт", icon: "fa-solid fa-flask", color: "#8fb8d9", initials: "Те" },
];

type SavedProgress = { completed: number[]; current: number; xp: number; streak: number; trKnown: string[] };
const STORAGE_PREFIX = "gitway:progress:v1:";
const loadProgress = (key: string): SavedProgress | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as SavedProgress) : null;
  } catch {
    return null;
  }
};
const saveProgress = (key: string, data: SavedProgress) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
};
type State = {
  screen: Screen;
  user: Account | null;
  completed: number[];
  current: number;
  activeId: number;
  xp: number;
  streak: number;
  // quiz
  quizIndex: number;
  selected: number | null;
  answered: boolean;
  correct: number;
  quizDone: boolean;
  earned: number;
  // командний квіз (CLI-курси)
  cmdInput: string;
  cmdChecked: boolean;
  cmdOk: boolean;
  // trainer
  trCat: Command["cat"];
  trMode: TrMode;
  trIndex: number;
  trReveal: boolean;
  trKnown: string[];
  spellInput: string;
  spellChecked: boolean;
  spellOk: boolean;
  trQuery: string; // пошук за ключовим словом
  trAll: boolean; // «усі джерела» (ігнорувати категорію)
};

const initialState: State = {
  screen: "login",
  user: null,
  completed: [],
  current: 1,
  activeId: 1,
  xp: 0,
  streak: 0,
  quizIndex: 0,
  selected: null,
  answered: false,
  correct: 0,
  quizDone: false,
  earned: 0,
  cmdInput: "",
  cmdChecked: false,
  cmdOk: false,
  trCat: "git",
  trMode: "cards",
  trIndex: 0,
  trReveal: false,
  trKnown: [],
  spellInput: "",
  spellChecked: false,
  spellOk: false,
  trQuery: "",
  trAll: false,
};

const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const scrollTop = () => {
  if (typeof window !== "undefined") window.scrollTo(0, 0);
};

export default function GitWayApp({ showLeaderboard = true }: { showLeaderboard?: boolean }) {
  const [s, setS] = useState<State>(initialState);
  const set = (patch: Partial<State>) => setS((prev) => ({ ...prev, ...patch }));

  // Git-рушій пісочниці. Один екземпляр на акаунт, спільний для терміналу й GitHub-UI.
  const [engine, setEngine] = useState<GitEngine | null>(null);

  // Автозбереження прогресу поточного акаунта в localStorage.
  useEffect(() => {
    if (!s.user) return;
    saveProgress(s.user.key, { completed: s.completed, current: s.current, xp: s.xp, streak: s.streak, trKnown: s.trKnown });
  }, [s.user, s.completed, s.current, s.xp, s.streak, s.trKnown]);

  // ---------- navigation ----------
  const go = (screen: Screen) => {
    set({ screen });
    scrollTop();
  };
  const selectAccount = (acc: Account) => {
    // Вантажимо збережений прогрес акаунта або чистий старт.
    const saved = loadProgress(acc.key);
    const base: SavedProgress = saved ?? { completed: [], current: 1, xp: 0, streak: 0, trKnown: [] };
    set({
      user: acc,
      screen: "roadmap",
      completed: base.completed,
      current: base.current,
      activeId: base.current,
      xp: base.xp,
      streak: base.streak,
      trKnown: base.trKnown,
      // скидаємо тимчасовий стан
      quizIndex: 0,
      selected: null,
      answered: false,
      correct: 0,
      quizDone: false,
      earned: 0,
      cmdInput: "",
      cmdChecked: false,
      cmdOk: false,
      trCat: "git",
      trMode: "cards",
      trIndex: 0,
      trReveal: false,
      spellInput: "",
      spellChecked: false,
      spellOk: false,
    });
    // Створюємо/завантажуємо рушій пісочниці для цього акаунта.
    const ws = loadWorkspace(acc.key) ?? createSeedWorkspace(acc.key, Date.now);
    setEngine(new GitEngine(ws, Date.now));
    scrollTop();
  };
  const logout = () => {
    set({ screen: "login", user: null });
    setEngine(null);
    scrollTop();
  };
  const openLesson = (id: number) => {
    set({ activeId: id, screen: "lesson" });
    scrollTop();
  };
  // Перехід до наступного уроку після завершення тесту (без повернення на карту).
  const goNextLesson = () => {
    const nextId = s.activeId + 1;
    if (nextId > TOTAL_LESSONS) {
      go("roadmap");
      return;
    }
    set({
      activeId: nextId,
      screen: "lesson",
      // скидаємо стан тесту попереднього уроку
      quizIndex: 0,
      selected: null,
      answered: false,
      correct: 0,
      quizDone: false,
      earned: 0,
      cmdInput: "",
      cmdChecked: false,
      cmdOk: false,
    });
    scrollTop();
  };
  const goSandbox = () => {
    set({ screen: "sandbox" });
    scrollTop();
  };
  const goCli = () => {
    set({ screen: "cli" });
    scrollTop();
  };
  const startQuiz = () => {
    set({ screen: "quiz", quizIndex: 0, selected: null, answered: false, correct: 0, quizDone: false, earned: 0, cmdInput: "", cmdChecked: false, cmdOk: false });
    scrollTop();
  };
  const goTrainer = () => {
    set({ screen: "trainer" });
    scrollTop();
  };

  // ---------- trainer ----------
  // Єдиний перелік команд: «усі джерела» або одна категорія, плюс пошук.
  const currentTrList = (st: State): Command[] => {
    const source = st.trAll ? CMDS : CMDS.filter((c) => c.cat === st.trCat);
    const q = norm(st.trQuery);
    if (!q) return source;
    return source.filter((c) => norm(c.cmd).includes(q) || norm(c.desc).includes(q) || norm(c.example).includes(q));
  };
  const setTrCat = (c: Command["cat"]) =>
    set({ trCat: c, trAll: false, trIndex: 0, trReveal: false, spellInput: "", spellChecked: false, spellOk: false });
  const setTrAll = () =>
    set({ trAll: true, trIndex: 0, trReveal: false, spellInput: "", spellChecked: false, spellOk: false });
  const setTrQuery = (q: string) =>
    set({ trQuery: q, trIndex: 0, trReveal: false, spellChecked: false, spellOk: false });
  const setTrMode = (m: TrMode) =>
    set({ trMode: m, trReveal: false, trIndex: 0, spellInput: "", spellChecked: false, spellOk: false });
  const trDoReveal = () => set({ trReveal: true });
  const trAdvance = (known: boolean) => {
    const list = currentTrList(s);
    if (!list.length) return;
    const cur = list[s.trIndex % list.length];
    let kn = s.trKnown;
    if (known && cur && kn.indexOf(cur.id) < 0) kn = kn.concat([cur.id]);
    set({ trKnown: kn, trIndex: s.trIndex + 1, trReveal: false });
  };
  const spellCheck = () => {
    if (s.spellChecked) return;
    const list = currentTrList(s);
    if (!list.length) return;
    const cur = list[s.trIndex % list.length];
    const inp = norm(s.spellInput);
    if (!inp) return;
    const full = norm(cur.cmd);
    const base = norm(cur.cmd.split(/ [<"]/)[0]);
    const ok = inp === full || (base.length > 2 && inp === base) || (base.length > 2 && inp.indexOf(base) === 0);
    let kn = s.trKnown;
    if (ok && kn.indexOf(cur.id) < 0) kn = kn.concat([cur.id]);
    set({ spellChecked: true, spellOk: ok, trKnown: kn });
  };
  const spellNext = () => set({ trIndex: s.trIndex + 1, spellInput: "", spellChecked: false, spellOk: false });

  // ---------- quiz ----------
  const activeLesson = LESSONS.find((l) => l.id === s.activeId) || LESSONS[0];
  // Кількість питань у квізі уроку: командний квіз має пріоритет над MCQ.
  const quizCount = (l: Lesson) => l.commandQuiz?.length ?? l.quiz.length;
  const quizPick = (oi: number) => {
    if (s.answered) return;
    const q = activeLesson.quiz[s.quizIndex];
    set({ selected: oi, answered: true, correct: s.correct + (oi === q.correct ? 1 : 0) });
  };
  // Командний квіз: перевірка введеної команди за accept-патернами.
  // Відповідь введенням команди (додатковий спосіб) — зараховується як відповідь.
  const cmdCheck = () => {
    if (s.answered) return;
    const q = activeLesson.commandQuiz?.[s.quizIndex];
    if (!q || !q.accept || !s.cmdInput.trim()) return;
    const ok = matchesAccept(s.cmdInput, q.accept);
    set({ answered: true, cmdChecked: true, cmdOk: ok, selected: ok ? q.correct ?? null : -1, correct: s.correct + (ok ? 1 : 0) });
  };
  // Відповідь вибором варіанта (основний спосіб).
  const cmdMcqPick = (oi: number) => {
    if (s.answered) return;
    const q = activeLesson.commandQuiz?.[s.quizIndex];
    if (!q || q.correct == null) return;
    set({ selected: oi, answered: true, correct: s.correct + (oi === q.correct ? 1 : 0) });
  };
  const quizNext = () => {
    const total = quizCount(activeLesson);
    if (s.quizIndex + 1 >= total) {
      const gain = activeLesson.xp + s.correct * 20;
      const done = s.completed.includes(s.activeId) ? s.completed : s.completed.concat([s.activeId]);
      const nextCur = Math.min(TOTAL_LESSONS, Math.max(s.current, s.activeId + 1));
      set({ quizDone: true, earned: gain, xp: s.xp + gain, completed: done, current: nextCur });
    } else {
      set({ quizIndex: s.quizIndex + 1, selected: null, answered: false, cmdInput: "", cmdChecked: false, cmdOk: false });
    }
  };

  const statusOf = (id: number): "done" | "current" | "locked" => {
    if (s.completed.includes(id)) return "done";
    if (id === s.current) return "current";
    return "locked";
  };

  // ================= derived =================
  const user = s.user ?? ACCOUNTS[0];
  const userFirst = user.name.split(" ")[0];
  const doneCount = s.completed.length;
  const progressPct = Math.round((doneCount / TOTAL_LESSONS) * 100);

  const navBase =
    "display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border:none;cursor:pointer;border-radius:14px;font-weight:800;font-size:14px;transition:all .15s;";
  const navOn = navBase + "color:#0d7d70;background:#d8f3ee;box-shadow:inset 0 2px 5px rgba(17,74,68,.08);";
  const navOff = navBase + "color:#7d8f8a;background:transparent;";

  // ---------- header ----------
  const Header = () =>
    s.screen === "login" ? null : (
      <header style={sx("position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:20px;padding:14px 30px;background:rgba(244,248,246,.82);backdrop-filter:blur(14px);border-bottom:1px solid rgba(17,74,68,.06)")}>
        <button onClick={() => go("roadmap")} style={sx("display:flex;align-items:center;gap:11px;background:none;border:none;cursor:pointer;padding:0")}>
          <span style={sx("display:grid;place-items:center;width:44px;height:44px;border-radius:15px;background:#14b8a6;color:#fff;font-size:19px;box-shadow:0 9px 16px -5px rgba(20,184,166,.6),inset 0 -4px 8px rgba(6,95,85,.4),inset 0 4px 7px rgba(255,255,255,.35)")}>
            <Icon name="fa-solid fa-code-branch" />
          </span>
          <span className="disp" style={sx("font-size:22px;font-weight:800;color:#14332f;letter-spacing:-.5px")}>GitШлях</span>
        </button>
        <nav style={sx("display:flex;gap:6px;margin-left:14px")}>
          <button onClick={() => go("roadmap")} style={sx(s.screen === "roadmap" ? navOn : navOff)}>
            <Icon name="fa-solid fa-map" /> Дорожня карта
          </button>
          <button onClick={goTrainer} style={sx(s.screen === "trainer" ? navOn : navOff)}>
            <Icon name="fa-solid fa-dumbbell" /> Тренажер
          </button>
          <button onClick={goSandbox} style={sx(s.screen === "sandbox" ? navOn : navOff)}>
            <Icon name="fa-solid fa-terminal" /> Пісочниця
          </button>
          <button onClick={goCli} style={sx(s.screen === "cli" ? navOn : navOff)}>
            <Icon name="fa-solid fa-robot" /> CLI
          </button>
          <button onClick={() => go("progress")} style={sx(s.screen === "progress" ? navOn : navOff)}>
            <Icon name="fa-solid fa-chart-simple" /> Мій прогрес
          </button>
        </nav>
        <div style={sx("flex:1")} />
        <div style={sx("display:flex;align-items:center;gap:9px;padding:8px 15px;border-radius:16px;background:#fff;box-shadow:inset 0 -3px 7px rgba(17,74,68,.05),inset 0 3px 6px rgba(255,255,255,.9),0 5px 12px -6px rgba(17,74,68,.15)")}>
          <Icon name="fa-solid fa-fire" style={sx("color:#f2994a;font-size:17px")} />
          <span style={sx("font-weight:800;font-size:15px")}>{s.streak}</span>
        </div>
        <div style={sx("display:flex;align-items:center;gap:9px;padding:8px 15px;border-radius:16px;background:#fff;box-shadow:inset 0 -3px 7px rgba(17,74,68,.05),inset 0 3px 6px rgba(255,255,255,.9),0 5px 12px -6px rgba(17,74,68,.15)")}>
          <Icon name="fa-solid fa-bolt" style={sx("color:#14b8a6;font-size:16px")} />
          <span style={sx("font-weight:800;font-size:15px")}>{s.xp} XP</span>
        </div>
        <button onClick={() => go("progress")} title={user.name} style={sx("display:flex;align-items:center;gap:10px;background:none;border:none;cursor:pointer;padding:4px 4px 4px 0")}>
          <span style={sx(`display:grid;place-items:center;width:44px;height:44px;border-radius:50%;color:#fff;font-size:18px;background:${user.color};box-shadow:0 7px 14px -5px rgba(17,74,68,.3),inset 0 -3px 6px rgba(0,0,0,.12),inset 0 3px 6px rgba(255,255,255,.35)`)}>
            <Icon name={user.icon} />
          </span>
        </button>
        <button onClick={logout} title="Вийти" style={sx("display:grid;place-items:center;width:40px;height:40px;border-radius:13px;border:none;cursor:pointer;color:#8b9c97;background:#fff;box-shadow:inset 0 -3px 6px rgba(17,74,68,.05),inset 0 3px 5px rgba(255,255,255,.9),0 4px 10px -6px rgba(17,74,68,.15)")}>
          <Icon name="fa-solid fa-arrow-right-from-bracket" />
        </button>
      </header>
    );

  // ---------- login: вибір акаунта-відділу ----------
  const Login = () => (
    <main style={sx("flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 24px 70px;animation:floatUp .5s ease")}>
      <span style={sx("display:grid;place-items:center;width:82px;height:82px;border-radius:28px;background:#14b8a6;color:#fff;font-size:36px;margin-bottom:22px;box-shadow:0 18px 30px -10px rgba(20,184,166,.6),inset 0 -6px 12px rgba(6,95,85,.4),inset 0 6px 11px rgba(255,255,255,.35);animation:bob 4s ease-in-out infinite")}>
        <Icon name="fa-solid fa-code-branch" />
      </span>
      <h1 className="disp" style={sx("font-size:42px;font-weight:800;letter-spacing:-1px;margin-bottom:8px;text-align:center")}>Ласкаво просимо до GitШлях</h1>
      <p style={sx("font-size:19px;color:#5b6d68;margin:0 0 36px;max-width:560px;text-align:center;text-wrap:pretty")}>
        Оберіть, під яким відділом увійти — прогрес кожного акаунта зберігається окремо.
      </p>
      {/* 9 відділів у сітці 5 + 4 (на вузьких екранах перенос адаптивний) */}
      <div style={sx("display:flex;flex-wrap:wrap;justify-content:center;gap:16px;width:100%;max-width:960px")}>
        {ACCOUNTS.map((acc) => (
          <Clay
            key={acc.key}
            onClick={() => selectAccount(acc)}
            base="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;width:178px;padding:22px 16px;border:none;cursor:pointer;border-radius:24px;background:#fff;transition:transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .18s ease;box-shadow:0 16px 32px -18px rgba(17,74,68,.3),inset 0 -5px 11px rgba(17,74,68,.045),inset 0 6px 12px rgba(255,255,255,.9)"
            hover="transform:translateY(-5px);box-shadow:0 26px 40px -18px rgba(17,74,68,.35),inset 0 -5px 11px rgba(17,74,68,.045),inset 0 6px 12px rgba(255,255,255,.9)"
          >
            <span style={sx(`display:grid;place-items:center;width:64px;height:64px;border-radius:20px;color:#fff;font-size:27px;background:${acc.color};box-shadow:0 12px 22px -8px ${acc.color}cc,inset 0 -4px 8px rgba(0,0,0,.15),inset 0 5px 9px rgba(255,255,255,.35)`)}>
              <Icon name={acc.icon} />
            </span>
            <span style={sx("display:flex;flex-direction:column;gap:3px")}>
              <span style={sx("font-weight:800;font-size:15.5px;color:#14332f")}>{acc.name}</span>
              <span style={sx("font-size:12px;color:#8b9c97;font-weight:600;line-height:1.3")}>{acc.role}</span>
            </span>
          </Clay>
        ))}
      </div>
    </main>
  );

  // ---------- roadmap ----------
  const Roadmap = () => (
    <main style={sx("flex:1;max-width:900px;margin:0 auto;width:100%;padding:34px 24px 90px;animation:floatUp .45s ease")}>
      <div style={sx("display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px;flex-wrap:wrap")}>
        <div>
          <p style={sx("margin:0 0 4px;color:#8b9c97;font-weight:700;font-size:14px")}>Вітаємо, {userFirst}!</p>
          <h1 className="disp" style={sx("font-size:34px;font-weight:800;letter-spacing:-.7px")}>Ваш шлях у світ Git</h1>
        </div>
        <div style={sx("display:flex;gap:12px")}>
          <div style={sx("text-align:center;padding:12px 18px;border-radius:20px;background:#fff;box-shadow:inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 7px rgba(255,255,255,.9),0 8px 18px -10px rgba(17,74,68,.2)")}>
            <div className="disp" style={sx("font-size:24px;font-weight:800;color:#14b8a6")}>{doneCount}/{TOTAL_LESSONS}</div>
            <div style={sx("font-size:12.5px;color:#8b9c97;font-weight:700")}>уроків</div>
          </div>
          <div style={sx("text-align:center;padding:12px 18px;border-radius:20px;background:#fff;box-shadow:inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 7px rgba(255,255,255,.9),0 8px 18px -10px rgba(17,74,68,.2)")}>
            <div className="disp" style={sx("font-size:24px;font-weight:800;color:#f2994a")}>
              {s.streak} <Icon name="fa-solid fa-fire" style={sx("font-size:18px")} />
            </div>
            <div style={sx("font-size:12.5px;color:#8b9c97;font-weight:700")}>днів поспіль</div>
          </div>
        </div>
      </div>
      <div style={sx("background:#fff;border-radius:20px;padding:16px 20px;margin-bottom:34px;box-shadow:inset 0 -4px 9px rgba(17,74,68,.05),inset 0 5px 9px rgba(255,255,255,.9),0 10px 22px -12px rgba(17,74,68,.2)")}>
        <div style={sx("display:flex;justify-content:space-between;font-weight:700;font-size:13.5px;margin-bottom:9px")}>
          <span style={sx("color:#5b6d68")}>Загальний прогрес</span>
          <span style={sx("color:#14b8a6")}>{progressPct}%</span>
        </div>
        <div style={sx("height:15px;border-radius:20px;background:#e4ebe8;box-shadow:inset 0 2px 5px rgba(17,74,68,.13)")}>
          <div style={sx(`height:100%;border-radius:20px;width:${progressPct}%;background:linear-gradient(90deg,#14b8a6,#2dd4bf);box-shadow:0 2px 6px rgba(20,184,166,.5),inset 0 2px 3px rgba(255,255,255,.4);transition:width .6s ease`)} />
        </div>
      </div>

      {PHASE_IDS.map((pid, pi) => {
        const m = PHASE_META[pid];
        const items = LESSONS.filter((l) => l.phase === pid);
        const totalInPhase = items.length;
        const doneInPhase = items.filter((l) => s.completed.includes(l.id)).length;
        const prevItems = pi === 0 ? [] : LESSONS.filter((l) => l.phase === PHASE_IDS[pi - 1]);
        const unlocked = pi === 0 || prevItems.every((l) => s.completed.includes(l.id));
        const complete = doneInPhase === totalInPhase;
        const locked = !unlocked;
        const pct = Math.round((doneInPhase / totalInPhase) * 100);

        const cardBase =
          "border-radius:28px;padding:26px 28px;margin-bottom:22px;background:#fff;box-shadow:0 18px 40px -22px rgba(17,74,68,.32),inset 0 -6px 12px rgba(17,74,68,.05),inset 0 8px 14px rgba(255,255,255,.9);";
        const cardStyle = locked
          ? cardBase + "filter:grayscale(.15);"
          : complete
            ? cardBase.replace("0 18px 40px -22px rgba(17,74,68,.32)", "0 18px 40px -22px rgba(20,184,166,.4),inset 0 0 0 2px rgba(20,184,166,.35)")
            : cardBase;

        let statusPill = "padding:6px 15px;border-radius:20px;font-weight:800;font-size:13px;";
        let statusText: string;
        if (complete) {
          statusPill += "background:#14b8a6;color:#fff;box-shadow:0 8px 15px -6px rgba(20,184,166,.6);";
          statusText = "Пройдено ✓";
        } else if (unlocked) {
          statusPill += "background:#d8f3ee;color:#0d7d70;";
          statusText = doneInPhase + " / " + totalInPhase;
        } else {
          statusPill += "background:#eef3f1;color:#a7b6b1;";
          statusText = "Закрито";
        }
        const rowDim = locked ? "opacity:.5;filter:grayscale(.4);pointer-events:none" : "";
        const lockText = "Завершіть Рівень " + PHASE_IDS[pi - 1] + ", щоб відкрити цей рівень";

        return (
          <section key={pid} style={sx(cardStyle)}>
            <div style={sx("display:flex;align-items:center;gap:16px;margin-bottom:18px;flex-wrap:wrap")}>
              <span style={sx(`display:grid;place-items:center;width:58px;height:58px;border-radius:20px;font-size:22px;color:#fff;background:${m.color};box-shadow:0 10px 18px -7px rgba(17,74,68,.4),inset 0 -4px 8px rgba(0,0,0,.15),inset 0 4px 7px rgba(255,255,255,.3)`)}>
                <Icon name={m.icon} />
              </span>
              <div style={sx("flex:1;min-width:180px")}>
                <div style={sx("font-size:12.5px;font-weight:800;color:#8b9c97;letter-spacing:.4px")}>РІВЕНЬ {pid} · {m.sub}</div>
                <h2 className="disp" style={sx("font-size:25px;font-weight:800;letter-spacing:-.4px")}>{m.name}</h2>
              </div>
              <span style={sx(statusPill)}>{statusText}</span>
            </div>
            <div style={sx("height:11px;border-radius:20px;background:#e4ebe8;box-shadow:inset 0 2px 4px rgba(17,74,68,.12);margin-bottom:24px")}>
              <div style={sx(`height:100%;border-radius:20px;width:${pct}%;background:linear-gradient(90deg,#14b8a6,#2dd4bf);box-shadow:0 2px 5px rgba(20,184,166,.5);transition:width .6s ease`)} />
            </div>
            <div style={sx(`display:flex;flex-wrap:wrap;gap:22px;justify-content:center;${rowDim}`)}>
              {items.map((l) => {
                const st = statusOf(l.id);
                const done = st === "done";
                const cur = st === "current" && unlocked;
                const nodeLocked = !unlocked || st === "locked";
                let btn = "width:76px;height:76px;border-radius:50%;border:none;font-size:26px;transition:transform .18s cubic-bezier(.34,1.56,.64,1);";
                if (nodeLocked) {
                  btn += "cursor:not-allowed;background:#d8e0dc;color:#a7b6b1;box-shadow:0 8px 15px -7px rgba(17,74,68,.2),inset 0 -4px 8px rgba(17,74,68,.07),inset 0 5px 9px rgba(255,255,255,.85);";
                } else if (cur) {
                  btn += "cursor:pointer;background:#14b8a6;color:#fff;box-shadow:0 12px 22px -6px rgba(20,184,166,.55),inset 0 -5px 10px rgba(6,95,85,.4),inset 0 5px 9px rgba(255,255,255,.4);animation:pulse 2s infinite;";
                } else {
                  btn += "cursor:pointer;background:#14b8a6;color:#fff;box-shadow:0 11px 20px -7px rgba(20,184,166,.5),inset 0 -5px 10px rgba(6,95,85,.4),inset 0 5px 9px rgba(255,255,255,.4);";
                }
                const icon = done ? "fa-solid fa-check" : nodeLocked ? "fa-solid fa-lock" : l.icon;
                return (
                  <div key={l.id} style={sx("display:flex;flex-direction:column;align-items:center;gap:9px;width:134px;text-align:center")}>
                    {nodeLocked ? (
                      <button disabled style={sx(btn)}>
                        <Icon name={icon} />
                      </button>
                    ) : (
                      <Clay onClick={() => openLesson(l.id)} base={btn} hover="transform:translateY(-4px) scale(1.05)">
                        <Icon name={icon} />
                      </Clay>
                    )}
                    <div style={sx(`font-weight:800;font-size:13.5px;line-height:1.25;color:${nodeLocked ? "#a7b6b1" : "#14332f"}`)}>{l.title}</div>
                    {cur && (
                      <span style={sx("padding:3px 12px;border-radius:20px;background:#14b8a6;color:#fff;font-size:11.5px;font-weight:800;box-shadow:0 6px 12px -4px rgba(20,184,166,.6)")}>Почати →</span>
                    )}
                    {done && (
                      <span style={sx("font-size:11.5px;font-weight:700;color:#14b8a6")}>
                        <Icon name="fa-solid fa-check" /> +{l.xp} XP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {locked && (
              <div style={sx("display:flex;align-items:center;justify-content:center;gap:10px;margin-top:22px;padding:14px;border-radius:16px;background:#f1f5f3;color:#8b9c97;font-weight:700;font-size:14px")}>
                <Icon name="fa-solid fa-lock" /> {lockText}
              </div>
            )}
          </section>
        );
      })}
    </main>
  );

  // ---------- trainer ----------
  const Trainer = () => {
    const trList = currentTrList(s);
    const trTotal = trList.length;
    const trPosIdx = trTotal ? s.trIndex % trTotal : 0;
    const curC = trList[trPosIdx];
    // У режимі «усі джерела» бейдж бере категорію поточної картки.
    const cm = curC ? CAT_META[curC.cat] : CAT_META[s.trCat];
    const trKnownCount = trList.filter((c) => s.trKnown.indexOf(c.id) >= 0).length;
    const empty = trTotal === 0;

    const chipBase = "display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border:none;cursor:pointer;border-radius:14px;font-weight:800;font-size:13.5px;transition:all .15s;";
    const segBase = "display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border:none;cursor:pointer;border-radius:12px;font-weight:800;font-size:14px;transition:all .15s;";
    const segOn = segBase + "color:#0d7d70;background:#fff;box-shadow:0 5px 11px -6px rgba(17,74,68,.28);";
    const segOff = segBase + "color:#7d8f8a;background:transparent;";

    return (
      <main style={sx("flex:1;max-width:840px;margin:0 auto;width:100%;padding:34px 24px 90px;animation:floatUp .4s ease")}>
        <div style={sx("display:flex;align-items:center;gap:14px;margin-bottom:8px")}>
          <span style={sx("display:grid;place-items:center;width:54px;height:54px;border-radius:18px;font-size:23px;color:#fff;background:#14b8a6;box-shadow:0 10px 18px -7px rgba(20,184,166,.55),inset 0 -4px 8px rgba(6,95,85,.4),inset 0 4px 7px rgba(255,255,255,.35)")}>
            <Icon name="fa-solid fa-dumbbell" />
          </span>
          <div>
            <div style={sx("font-size:12.5px;font-weight:800;color:#8b9c97;letter-spacing:.4px")}>ЗАПАМʼЯТАЙ КОМАНДИ</div>
            <h1 className="disp" style={sx("font-size:30px;font-weight:800;letter-spacing:-.6px")}>Тренажер команд</h1>
          </div>
        </div>
        <p style={sx("margin:0 0 22px;color:#5b6d68;font-size:15.5px;line-height:1.55;text-wrap:pretty")}>
          Єдина бібліотека всіх команд курсу — Git, термінал, GitHub, Claude Code та Codex. Фільтруй за джерелом, шукай за словом, гортай картки або відкрий довідник.
        </p>

        <div style={sx("display:inline-flex;gap:5px;padding:5px;border-radius:16px;margin-bottom:16px;background:#dde6e2;box-shadow:inset 0 2px 5px rgba(17,74,68,.1)")}>
          <button onClick={() => setTrMode("cards")} style={sx(s.trMode === "cards" ? segOn : segOff)}>
            <Icon name="fa-solid fa-clone" /> Картки
          </button>
          <button onClick={() => setTrMode("spell")} style={sx(s.trMode === "spell" ? segOn : segOff)}>
            <Icon name="fa-solid fa-keyboard" /> Правопис
          </button>
          <button onClick={() => setTrMode("ref")} style={sx(s.trMode === "ref" ? segOn : segOff)}>
            <Icon name="fa-solid fa-list" /> Довідник
          </button>
        </div>

        <div style={sx("display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:11px 16px;border-radius:14px;background:#fff;box-shadow:inset 0 -3px 6px rgba(17,74,68,.05),inset 0 3px 5px rgba(255,255,255,.9),0 5px 12px -8px rgba(17,74,68,.2)")}>
          <Icon name="fa-solid fa-magnifying-glass" style={sx("color:#8b9c97")} />
          <input
            value={s.trQuery}
            onChange={(e) => setTrQuery(e.target.value)}
            placeholder="Пошук команди за назвою або описом…"
            aria-label="Пошук команди"
            style={sx("flex:1;border:none;background:none;outline:none;font-size:14.5px;color:#14332f;font-family:inherit")}
          />
          {s.trQuery && (
            <button onClick={() => setTrQuery("")} aria-label="Очистити пошук" style={sx("border:none;background:none;cursor:pointer;color:#a7b6b1")}>
              <Icon name="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        <div style={sx("display:flex;flex-wrap:wrap;gap:9px;margin-bottom:24px")}>
          <button
            onClick={setTrAll}
            style={sx(
              s.trAll
                ? chipBase + "color:#fff;background:#14332f;box-shadow:0 8px 15px -6px rgba(20,35,31,.5),inset 0 -3px 6px rgba(0,0,0,.15),inset 0 3px 5px rgba(255,255,255,.15);"
                : chipBase + "color:#5b6d68;background:#fff;box-shadow:inset 0 -3px 6px rgba(17,74,68,.05),inset 0 3px 5px rgba(255,255,255,.9),0 5px 12px -8px rgba(17,74,68,.2);",
            )}
          >
            <Icon name="fa-solid fa-layer-group" /> Усі джерела
          </button>
          {CAT_ORDER.map(([k, label]) => {
            const meta = CAT_META[k];
            const active = !s.trAll && s.trCat === k;
            const style = active
              ? chipBase + `color:#fff;background:${meta.color};box-shadow:0 8px 15px -6px ${meta.color}99,inset 0 -3px 6px rgba(0,0,0,.15),inset 0 3px 5px rgba(255,255,255,.25);`
              : chipBase + "color:#5b6d68;background:#fff;box-shadow:inset 0 -3px 6px rgba(17,74,68,.05),inset 0 3px 5px rgba(255,255,255,.9),0 5px 12px -8px rgba(17,74,68,.2);";
            return (
              <button key={k} onClick={() => setTrCat(k)} style={sx(style)}>
                <Icon name={meta.icon} /> {label}
              </button>
            );
          })}
        </div>

        {empty && (
          <div style={sx("padding:40px 24px;text-align:center;color:#8b9c97;font-weight:700;background:#fff;border-radius:24px;box-shadow:inset 0 -4px 8px rgba(17,74,68,.045),inset 0 4px 7px rgba(255,255,255,.9)")}>
            <Icon name="fa-solid fa-magnifying-glass" style={sx("font-size:26px;margin-bottom:10px")} /><br />
            Нічого не знайдено за запитом «{s.trQuery}».
          </div>
        )}

        {s.trMode === "cards" && !empty && curC && (
          <>
            <div style={sx("display:flex;justify-content:space-between;align-items:center;margin-bottom:12px")}>
              <span style={sx("font-weight:800;font-size:14px;color:#8b9c97")}>Картка {trPosIdx + 1} / {trTotal}</span>
              <span style={sx("font-weight:800;font-size:14px;color:#14b8a6")}>
                <Icon name="fa-solid fa-circle-check" /> Знаю: {trKnownCount} / {trTotal}
              </span>
            </div>
            <div style={sx("border-radius:28px;padding:34px 30px;min-height:250px;display:flex;flex-direction:column;background:#fff;box-shadow:0 20px 44px -22px rgba(17,74,68,.32),inset 0 -6px 12px rgba(17,74,68,.05),inset 0 8px 14px rgba(255,255,255,.9)")}>
              <span style={sx(`align-self:flex-start;display:inline-flex;align-items:center;gap:7px;padding:5px 13px;border-radius:20px;font-weight:800;font-size:12.5px;color:#fff;background:${cm.color}`)}>
                <Icon name={cm.icon} /> {cm.name}
              </span>
              <div style={sx("font-size:12.5px;font-weight:800;color:#c3a24a;letter-spacing:.5px;margin-top:20px")}>ДЛЯ ЧОГО?</div>
              <p style={sx("margin:6px 0 0;font-size:22px;font-weight:700;line-height:1.35;color:#14332f;text-wrap:pretty")}>{curC.desc}</p>
              {s.trReveal && (
                <div style={sx("margin-top:22px;padding-top:22px;border-top:1px dashed #d5ded9;animation:floatUp .3s ease")}>
                  <div style={sx("font-size:12.5px;font-weight:800;color:#8b9c97;letter-spacing:.5px;margin-bottom:9px")}>КОМАНДА</div>
                  <div style={sx("font-family:ui-monospace,Menlo,monospace;font-size:18px;font-weight:700;color:#7ee6d3;background:#0f2a27;border-radius:14px;padding:14px 18px;box-shadow:inset 0 2px 8px rgba(0,0,0,.3)")}>$ {curC.cmd}</div>
                  <p style={sx("margin:12px 0 0;font-size:14px;color:#5b6d68;line-height:1.5")}>
                    <b>Приклад:</b> {curC.example}
                  </p>
                </div>
              )}
              <div style={sx("flex:1")} />
              {!s.trReveal ? (
                <Clay onClick={trDoReveal} base="margin-top:24px;padding:15px;border:none;cursor:pointer;border-radius:16px;font-weight:800;font-size:16px;color:#fff;background:#14b8a6;box-shadow:0 14px 26px -10px rgba(20,184,166,.6),inset 0 -5px 10px rgba(6,95,85,.4),inset 0 5px 9px rgba(255,255,255,.32);transition:transform .15s" hover="transform:translateY(-2px)">
                  <Icon name="fa-solid fa-eye" /> Показати команду
                </Clay>
              ) : (
                <div style={sx("display:flex;gap:12px;margin-top:24px")}>
                  <button onClick={() => trAdvance(false)} style={sx("flex:1;padding:15px;border:none;cursor:pointer;border-radius:16px;font-weight:800;font-size:15px;color:#c0392b;background:#fdecea;box-shadow:inset 0 -3px 6px rgba(192,57,43,.06),inset 0 3px 5px rgba(255,255,255,.7),0 8px 16px -9px rgba(192,57,43,.2)")}>
                    <Icon name="fa-solid fa-rotate-left" /> Повторити
                  </button>
                  <button onClick={() => trAdvance(true)} style={sx("flex:1;padding:15px;border:none;cursor:pointer;border-radius:16px;font-weight:800;font-size:15px;color:#fff;background:#14b8a6;box-shadow:0 12px 22px -10px rgba(20,184,166,.6),inset 0 -4px 8px rgba(6,95,85,.4),inset 0 4px 7px rgba(255,255,255,.32)")}>
                    <Icon name="fa-solid fa-check" /> Знаю
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {s.trMode === "spell" && !empty && curC && (
          <>
            <div style={sx("display:flex;justify-content:space-between;align-items:center;margin-bottom:12px")}>
              <span style={sx("font-weight:800;font-size:14px;color:#8b9c97")}>Питання {trPosIdx + 1} / {trTotal}</span>
              <span style={sx("font-weight:800;font-size:14px;color:#14b8a6")}>
                <Icon name="fa-solid fa-circle-check" /> Вивчено: {trKnownCount} / {trTotal}
              </span>
            </div>
            <div style={sx("border-radius:28px;padding:34px 30px;background:#fff;box-shadow:0 20px 44px -22px rgba(17,74,68,.32),inset 0 -6px 12px rgba(17,74,68,.05),inset 0 8px 14px rgba(255,255,255,.9)")}>
              <span style={sx(`display:inline-flex;align-items:center;gap:7px;padding:5px 13px;border-radius:20px;font-weight:800;font-size:12.5px;color:#fff;background:${cm.color}`)}>
                <Icon name={cm.icon} /> {cm.name}
              </span>
              <div style={sx("font-size:12.5px;font-weight:800;color:#c3a24a;letter-spacing:.5px;margin-top:20px")}>ЯКА КОМАНДА ЦЕ РОБИТЬ?</div>
              <p style={sx("margin:6px 0 20px;font-size:22px;font-weight:700;line-height:1.35;color:#14332f;text-wrap:pretty")}>{curC.desc}</p>
              <div style={sx("display:flex;align-items:center;gap:10px")}>
                <span style={sx("font-family:ui-monospace,Menlo,monospace;font-size:18px;font-weight:800;color:#2dd4bf;flex:none")}>$</span>
                <input
                  value={s.spellInput}
                  onChange={(e) => {
                    if (!s.spellChecked) set({ spellInput: e.target.value });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (s.spellChecked) spellNext();
                      else spellCheck();
                    }
                  }}
                  placeholder="введіть команду по памʼяті…"
                  style={sx(
                    s.spellChecked
                      ? s.spellOk
                        ? "width:100%;font-family:ui-monospace,Menlo,monospace;font-size:17px;font-weight:700;padding:15px 18px;border:none;border-radius:14px;background:#0f2a27;color:#7ee6d3;box-shadow:inset 0 0 0 2px #14b8a6;outline:none"
                        : "width:100%;font-family:ui-monospace,Menlo,monospace;font-size:17px;font-weight:700;padding:15px 18px;border:none;border-radius:14px;background:#0f2a27;color:#ff9b8a;box-shadow:inset 0 0 0 2px #e57373;outline:none"
                      : "width:100%;font-family:ui-monospace,Menlo,monospace;font-size:17px;font-weight:700;padding:15px 18px;border:none;border-radius:14px;background:#0f2a27;color:#eafaf7;box-shadow:inset 0 2px 8px rgba(0,0,0,.3);outline:none",
                  )}
                />
              </div>
              {s.spellChecked && (
                <div style={sx(`display:flex;align-items:center;gap:10px;margin-top:18px;padding:14px 18px;border-radius:16px;font-weight:700;font-size:14.5px;${s.spellOk ? "background:#e5f8f3;color:#0d7d70" : "background:#fdecea;color:#c0392b"}`)}>
                  <Icon name="fa-solid fa-circle-check" />{" "}
                  <span>
                    Правильна відповідь: <b style={{ fontFamily: "ui-monospace,Menlo,monospace" }}>{curC.cmd}</b> — {curC.example}
                  </span>
                </div>
              )}
              {!s.spellChecked ? (
                <button onClick={spellCheck} style={sx("width:100%;margin-top:18px;padding:15px;border:none;cursor:pointer;border-radius:16px;font-weight:800;font-size:16px;color:#fff;background:#14b8a6;box-shadow:0 14px 26px -10px rgba(20,184,166,.6),inset 0 -5px 10px rgba(6,95,85,.4),inset 0 5px 9px rgba(255,255,255,.32)")}>
                  <Icon name="fa-solid fa-check-double" /> Перевірити
                </button>
              ) : (
                <button onClick={spellNext} style={sx("width:100%;margin-top:14px;padding:15px;border:none;cursor:pointer;border-radius:16px;font-weight:800;font-size:16px;color:#fff;background:#14b8a6;box-shadow:0 14px 26px -10px rgba(20,184,166,.6),inset 0 -5px 10px rgba(6,95,85,.4),inset 0 5px 9px rgba(255,255,255,.32)")}>
                  Наступне питання <Icon name="fa-solid fa-arrow-right" />
                </button>
              )}
            </div>
          </>
        )}

        {s.trMode === "ref" && !empty && (
          <div style={sx("display:grid;grid-template-columns:repeat(2,1fr);gap:14px")}>
            {trList.map((r) => {
              const rm = CAT_META[r.cat];
              return (
                <div key={r.id} style={sx("padding:18px 20px;border-radius:20px;background:#fff;box-shadow:inset 0 -4px 8px rgba(17,74,68,.045),inset 0 4px 7px rgba(255,255,255,.9),0 10px 22px -14px rgba(17,74,68,.22)")}>
                  <div style={sx("display:flex;align-items:center;gap:8px;margin-bottom:8px")}>
                    <span style={sx(`display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:800;color:#fff;background:${rm.color}`)}>
                      <Icon name={rm.icon} /> {rm.name}
                    </span>
                  </div>
                  <div style={sx("font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;color:#0d7d70;margin-bottom:7px")}>$ {r.cmd}</div>
                  <div style={sx("font-size:13.5px;color:#5b6d68;line-height:1.45")}>{r.desc}</div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    );
  };

  // ---------- sandbox (реальний термінал + клон GitHub) ----------
  const Sandbox = () => {
    if (!s.user || !engine) {
      return (
        <main style={sx("flex:1;display:grid;place-items:center;padding:60px 24px")}>
          <span style={sx("color:#8b9c97;font-weight:700")}>Завантаження пісочниці…</span>
        </main>
      );
    }
    return <SandboxPanel engine={engine} account={s.user.name} />;
  };

  // ---------- CLI (симулятор агентних CLI) ----------
  const Cli = () => <CliPanel account={user.name} />;

  // Порядковий номер уроку в межах його курсу (фази) + усього в курсі.
  const lessonPos = (l: Lesson) => {
    const inPhase = LESSONS.filter((x) => x.phase === l.phase);
    return { idx: inPhase.findIndex((x) => x.id === l.id) + 1, total: inPhase.length };
  };

  // ---------- lesson ----------
  const Lesson = () => {
    const al = activeLesson;
    const am = PHASE_META[al.phase];
    const pos = lessonPos(al);

    return (
      <main style={sx("flex:1;max-width:900px;margin:0 auto;width:100%;padding:26px 24px 90px;animation:floatUp .4s ease")}>
        <button onClick={() => go("roadmap")} style={sx("display:inline-flex;align-items:center;gap:8px;margin-bottom:18px;padding:9px 16px;border:none;cursor:pointer;border-radius:14px;font-weight:700;font-size:14px;color:#5b6d68;background:#fff;box-shadow:inset 0 -3px 6px rgba(17,74,68,.05),inset 0 3px 5px rgba(255,255,255,.9),0 5px 12px -7px rgba(17,74,68,.2)")}>
          <Icon name="fa-solid fa-arrow-left" /> До дорожньої карти
        </button>
        <div style={sx("display:flex;align-items:center;gap:8px;margin-bottom:6px")}>
          <span style={sx(`padding:4px 12px;border-radius:20px;background:${am.color};color:#fff;font-size:12px;font-weight:800`)}>{am.name}</span>
          <span style={sx("color:#8b9c97;font-weight:700;font-size:13.5px")}>Урок {pos.idx} з {pos.total} · {al.duration}</span>
        </div>
        <h1 className="disp" style={sx("font-size:32px;font-weight:800;letter-spacing:-.7px;margin-bottom:20px")}>{al.title}</h1>

        {/* video — показуємо плеєр лише коли відео є (для CLI-уроків його поки нема) */}
        {al.video && (
          <div style={sx("width:100%;aspect-ratio:16/9;border-radius:26px;overflow:hidden;margin-bottom:22px;background:#0f2a27;box-shadow:0 18px 40px -18px rgba(17,74,68,.35),inset 0 0 0 1px rgba(17,74,68,.05)")}>
            <video src={al.video} controls playsInline preload="metadata" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
          </div>
        )}

        {/* окрема озвучка уроку */}
        {al.audio && <AudioPlayer src={al.audio} />}

        {/* analogy — лише для класичних уроків (CLI-курси дають опис у теорії) */}
        {!al.commandQuiz && (
          <div style={sx("display:flex;gap:16px;padding:22px 24px;border-radius:24px;margin-bottom:22px;background:#fff;box-shadow:0 14px 32px -18px rgba(17,74,68,.3),inset 0 -5px 11px rgba(17,74,68,.045),inset 0 6px 11px rgba(255,255,255,.9)")}>
            <span style={sx("flex:none;display:grid;place-items:center;width:50px;height:50px;border-radius:16px;background:#fef3e6;color:#f2994a;font-size:22px;box-shadow:inset 0 -3px 6px rgba(242,153,74,.12),inset 0 3px 5px rgba(255,255,255,.7)")}>
              <Icon name="fa-solid fa-lightbulb" />
            </span>
            <div>
              <div style={sx("display:inline-block;font-size:12px;font-weight:800;color:#f2994a;letter-spacing:.5px;margin-bottom:6px")}>АНАЛОГІЯ</div>
              <p style={sx("margin:0;font-size:16.5px;line-height:1.6;color:#3f524e;text-wrap:pretty;white-space:pre-line")}>{al.analogy}</p>
            </div>
          </div>
        )}

        {/* опис уроку: CLI-курси — блоковий рендер з підсвіткою; решта — звичайна теорія */}
        {al.commandQuiz ? (
          <LessonContent lesson={al} accent={am.color} />
        ) : (
          <div style={sx("border-radius:26px;background:#fff;padding:26px 28px;margin-bottom:22px;box-shadow:0 16px 36px -22px rgba(17,74,68,.3),inset 0 -5px 11px rgba(17,74,68,.045),inset 0 6px 11px rgba(255,255,255,.9)")}>
            {al.sections.map((sec, si) => (
              <div key={si} style={sx(si > 0 ? "margin-top:22px;padding-top:22px;border-top:1px solid #eef3f1" : "")}>
                {sec.h && <h3 className="disp" style={sx("font-size:19px;font-weight:800;color:#14332f;margin-bottom:10px")}>{sec.h}</h3>}
                {sec.body.map((b, bi) =>
                  b.startsWith("• ") ? (
                    <div key={bi} style={sx("display:flex;gap:10px;margin-top:7px")}>
                      <span style={sx("flex:none;margin-top:9px;width:7px;height:7px;border-radius:50%;background:#14b8a6")} />
                      <span style={sx("font-size:15.5px;line-height:1.55;color:#3f524e")}>{b.slice(2)}</span>
                    </div>
                  ) : (
                    <p key={bi} style={sx("margin:7px 0 0;font-size:15.5px;line-height:1.6;color:#3f524e;text-wrap:pretty")}>{b}</p>
                  ),
                )}
              </div>
            ))}
          </div>
        )}

        {/* заклик до практики: CLI-уроки → вкладка CLI, решта → Пісочниця */}
        <div style={sx("display:flex;align-items:center;gap:16px;padding:20px 24px;border-radius:24px;background:linear-gradient(120deg,#0f2a27,#14413a);color:#eafaf7;box-shadow:0 20px 44px -20px rgba(17,74,68,.5)")}>
          <span style={sx("flex:none;display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:rgba(45,212,191,.18);color:#7ee6d3;font-size:22px")}>
            <Icon name={al.commandQuiz ? "fa-solid fa-robot" : "fa-solid fa-terminal"} />
          </span>
          <div style={sx("flex:1;min-width:0")}>
            <div style={sx("font-weight:800;font-size:17px;margin-bottom:3px")}>
              {al.commandQuiz ? "Спробуйте команди у вкладці CLI" : "Спробуйте на практиці у Пісочниці"}
            </div>
            <div style={sx("color:#9fd8cd;font-size:14px;line-height:1.5")}>
              {al.commandQuiz
                ? "Симулятор Claude Code / Codex — виконуйте команди цього уроку без ризику."
                : "Справжній термінал і клон GitHub — виконуйте команди цього уроку без ризику."}
            </div>
          </div>
          <Clay onClick={al.commandQuiz ? goCli : goSandbox} base="flex:none;display:inline-flex;align-items:center;gap:9px;padding:12px 20px;border:none;cursor:pointer;border-radius:15px;font-weight:800;font-size:14.5px;color:#0f2a27;background:#2dd4bf;box-shadow:0 12px 22px -10px rgba(45,212,191,.7);transition:transform .15s" hover="transform:translateY(-2px)">
            Відкрити <Icon name="fa-solid fa-arrow-right" />
          </Clay>
        </div>

        <Clay onClick={startQuiz} base="display:flex;align-items:center;justify-content:center;gap:11px;width:100%;margin-top:26px;padding:18px;border:none;cursor:pointer;border-radius:20px;font-weight:800;font-size:17px;color:#fff;background:#14b8a6;box-shadow:0 16px 30px -12px rgba(20,184,166,.65),inset 0 -5px 11px rgba(6,95,85,.4),inset 0 5px 9px rgba(255,255,255,.32);transition:transform .16s" hover="transform:translateY(-3px)">
          Позначити пройденим і пройти квіз <Icon name="fa-solid fa-arrow-right" />
        </Clay>
      </main>
    );
  };

  // ---------- quiz ----------
  // Питання CLI-квізу: основний спосіб — вибір варіанта; додатковий — ввести команду.
  const CommandQuestion = () => {
    const cq = activeLesson.commandQuiz!;
    const q = cq[s.quizIndex];
    const nextLabel = s.quizIndex + 1 >= cq.length ? "Завершити урок" : "Наступне питання";
    const opts = q.options ?? [];
    const wasCorrect = s.cmdChecked ? s.cmdOk : s.selected === q.correct;
    const inpStyle = s.cmdChecked
      ? s.cmdOk
        ? "width:100%;font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;padding:12px 15px;border:none;border-radius:12px;background:#0f2a27;color:#7ee6d3;box-shadow:inset 0 0 0 2px #14b8a6;outline:none"
        : "width:100%;font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;padding:12px 15px;border:none;border-radius:12px;background:#0f2a27;color:#ff9b8a;box-shadow:inset 0 0 0 2px #e57373;outline:none"
      : "width:100%;font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;padding:12px 15px;border:none;border-radius:12px;background:#0f2a27;color:#eafaf7;box-shadow:inset 0 2px 8px rgba(0,0,0,.3);outline:none";

    return (
      <>
        <h1 className="disp" style={sx("font-size:24px;font-weight:800;letter-spacing:-.4px;margin-bottom:8px;line-height:1.3;text-wrap:pretty")}>{q.scenario}</h1>
        <p style={sx("margin:0 0 18px;color:#8b9c97;font-size:14px;font-weight:600")}>
          <Icon name="fa-solid fa-list-check" /> Оберіть правильну команду
        </p>
        <div style={sx("display:flex;flex-direction:column;gap:12px")}>
          {opts.map((label, oi) => {
            const isSel = s.selected === oi;
            const isCor = oi === q.correct;
            let st = "display:flex;align-items:center;gap:14px;text-align:left;padding:15px 18px;border:none;border-radius:16px;font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:15px;transition:all .18s;background:#fff;";
            let badge = "display:grid;place-items:center;flex:none;width:30px;height:30px;border-radius:9px;font-weight:800;font-size:13px;font-family:Nunito,sans-serif;";
            if (!s.answered) {
              st += "cursor:pointer;color:#14332f;box-shadow:inset 0 -4px 8px rgba(17,74,68,.045),inset 0 4px 7px rgba(255,255,255,.9),0 8px 18px -11px rgba(17,74,68,.2);";
              badge += "background:#eef3f1;color:#5b6d68;";
            } else if (isCor) {
              st += "cursor:default;color:#0d7d70;background:#e5f8f3;box-shadow:inset 0 0 0 2px #14b8a6;";
              badge += "background:#14b8a6;color:#fff;";
            } else if (isSel) {
              st += "cursor:default;color:#c0392b;background:#fdecea;box-shadow:inset 0 0 0 2px #e57373;";
              badge += "background:#e57373;color:#fff;";
            } else {
              st += "cursor:default;color:#9aaba6;opacity:.6;";
              badge += "background:#eef3f1;color:#9aaba6;";
            }
            return (
              <button key={oi} onClick={() => cmdMcqPick(oi)} style={sx(st)}>
                <span style={sx(badge)}>{String.fromCharCode(65 + oi)}</span>
                <span style={sx("flex:1")}>{label}</span>
                {s.answered && isCor && <Icon name="fa-solid fa-check" style={sx("color:#14b8a6")} />}
                {s.answered && isSel && !isCor && <Icon name="fa-solid fa-xmark" style={sx("color:#e57373")} />}
              </button>
            );
          })}
        </div>

        {/* додатковий спосіб — ввести команду напам'ять */}
        {q.accept && !s.answered && (
          <div style={sx("margin-top:16px;padding:14px 16px;border-radius:16px;background:#f5f8f7;box-shadow:inset 0 0 0 1px rgba(17,74,68,.06)")}>
            <div style={sx("font-size:12.5px;font-weight:800;color:#8b9c97;margin-bottom:9px")}>
              <Icon name="fa-solid fa-keyboard" /> Знаєте напам'ять? Введіть команду замість вибору
            </div>
            <div style={sx("display:flex;gap:10px;align-items:center")}>
              <input
                value={s.cmdInput}
                onChange={(e) => set({ cmdInput: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") cmdCheck(); }}
                placeholder="напр. git status…"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                aria-label="Поле введення команди"
                style={sx(inpStyle)}
              />
              <button onClick={cmdCheck} style={sx("flex:none;padding:12px 16px;border:none;cursor:pointer;border-radius:12px;font-weight:800;font-size:14px;color:#0d7d70;background:#d8f3ee")}>
                <Icon name="fa-solid fa-check-double" /> Ввід
              </button>
            </div>
          </div>
        )}

        {s.answered && (
          <>
            {s.cmdChecked && (
              <div style={sx("margin-top:14px;display:flex;align-items:center;gap:10px")}>
                <span style={sx("font-family:ui-monospace,Menlo,monospace;font-size:16px;font-weight:800;color:#2dd4bf;flex:none")}>$</span>
                <input value={s.cmdInput} readOnly aria-label="Введена команда" style={sx(inpStyle)} />
              </div>
            )}
            <div style={sx("display:flex;align-items:flex-start;gap:10px;margin-top:16px;padding:14px 18px;border-radius:16px;font-weight:700;font-size:14.5px;line-height:1.5;" + (wasCorrect ? "background:#e5f8f3;color:#0d7d70;" : "background:#fdecea;color:#c0392b;"))}>
              <Icon name={wasCorrect ? "fa-solid fa-circle-check" : "fa-solid fa-circle-info"} />{" "}
              <span>{(wasCorrect ? "Правильно! " : "Не зовсім. ") + q.explanation}</span>
            </div>
            <button onClick={quizNext} style={sx("display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:16px;padding:16px;border:none;cursor:pointer;border-radius:18px;font-weight:800;font-size:16px;color:#fff;background:#14b8a6;box-shadow:0 14px 26px -10px rgba(20,184,166,.6),inset 0 -5px 10px rgba(6,95,85,.4),inset 0 5px 9px rgba(255,255,255,.32)")}>
              {nextLabel} <Icon name="fa-solid fa-arrow-right" />
            </button>
          </>
        )}
      </>
    );
  };

  // Питання MCQ-квізу (класичні уроки Git/GitHub).
  const McqQuestion = () => {
    const quiz = activeLesson.quiz;
    const total = quiz.length;
    const q = quiz[s.quizIndex];
    const optBase = "display:flex;align-items:center;gap:14px;text-align:left;padding:16px 18px;border:none;border-radius:18px;font-weight:700;font-size:15.5px;transition:all .18s;background:#fff;";
    const wasCorrect = s.selected === q.correct;
    const fbStyle =
      "display:flex;align-items:flex-start;gap:10px;margin-top:16px;padding:14px 18px;border-radius:16px;font-weight:700;font-size:14.5px;line-height:1.5;" +
      (wasCorrect ? "background:#e5f8f3;color:#0d7d70;" : "background:#fdecea;color:#c0392b;");
    const nextLabel = s.quizIndex + 1 >= total ? "Завершити урок" : "Наступне питання";
    return (
      <>
        <h1 className="disp" style={sx("font-size:26px;font-weight:800;letter-spacing:-.4px;margin-bottom:22px;line-height:1.25;text-wrap:pretty")}>{q.text}</h1>
        <div style={sx("display:flex;flex-direction:column;gap:13px")}>
          {q.opts.map((label, oi) => {
            const isSel = s.selected === oi;
            const isCor = oi === q.correct;
            let style = optBase;
            let badgeStyle = "display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:10px;font-weight:800;font-size:14px;";
            let icon = "";
            let iconStyle = "opacity:0;";
            if (!s.answered) {
              style += "cursor:pointer;color:#14332f;box-shadow:inset 0 -4px 8px rgba(17,74,68,.045),inset 0 4px 7px rgba(255,255,255,.9),0 8px 18px -11px rgba(17,74,68,.2);";
              badgeStyle += "background:#eef3f1;color:#5b6d68;";
            } else {
              style += "cursor:default;";
              if (isCor) {
                style += "color:#0d7d70;background:#e5f8f3;box-shadow:inset 0 0 0 2px #14b8a6;";
                badgeStyle += "background:#14b8a6;color:#fff;";
                icon = "fa-solid fa-check";
                iconStyle = "color:#14b8a6;";
              } else if (isSel) {
                style += "color:#c0392b;background:#fdecea;box-shadow:inset 0 0 0 2px #e57373;";
                badgeStyle += "background:#e57373;color:#fff;";
                icon = "fa-solid fa-xmark";
                iconStyle = "color:#e57373;";
              } else {
                style += "color:#9aaba6;opacity:.6;";
                badgeStyle += "background:#eef3f1;color:#9aaba6;";
              }
            }
            return (
              <button key={oi} onClick={() => quizPick(oi)} style={sx(style)}>
                <span style={sx(badgeStyle)}>{String.fromCharCode(65 + oi)}</span>
                <span style={sx("flex:1")}>{label}</span>
                <Icon name={icon || "fa-solid fa-check"} style={sx(iconStyle)} />
              </button>
            );
          })}
        </div>
        {s.answered && (
          <>
            <div style={sx(fbStyle)}>
              <Icon name={wasCorrect ? "fa-solid fa-circle-check" : "fa-solid fa-circle-info"} />{" "}
              <span>{(wasCorrect ? "Правильно! " : "Не зовсім. ") + q.expl}</span>
            </div>
            <button onClick={quizNext} style={sx("display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:16px;padding:16px;border:none;cursor:pointer;border-radius:18px;font-weight:800;font-size:16px;color:#fff;background:#14b8a6;box-shadow:0 14px 26px -10px rgba(20,184,166,.6),inset 0 -5px 10px rgba(6,95,85,.4),inset 0 5px 9px rgba(255,255,255,.32)")}>
              {nextLabel} <Icon name="fa-solid fa-arrow-right" />
            </button>
          </>
        )}
      </>
    );
  };

  const Quiz = () => {
    const isCmd = !!(activeLesson.commandQuiz && activeLesson.commandQuiz.length);
    const total = isCmd ? activeLesson.commandQuiz!.length : activeLesson.quiz.length;

    return (
      <main style={sx("flex:1;max-width:720px;margin:0 auto;width:100%;padding:34px 24px 90px;animation:floatUp .4s ease")}>
        {s.quizDone ? (
          <div style={sx("text-align:center;padding:20px 0;animation:popIn .5s ease")}>
            <span style={sx("display:grid;place-items:center;width:110px;height:110px;border-radius:50%;margin:0 auto 22px;font-size:48px;color:#fff;background:#14b8a6;box-shadow:0 22px 40px -14px rgba(20,184,166,.6),inset 0 -7px 14px rgba(6,95,85,.4),inset 0 7px 12px rgba(255,255,255,.35);animation:bob 3.5s ease-in-out infinite")}>
              <Icon name="fa-solid fa-trophy" />
            </span>
            <h1 className="disp" style={sx("font-size:34px;font-weight:800;margin-bottom:8px")}>Урок завершено!</h1>
            <p style={sx("font-size:18px;color:#5b6d68;margin:0 0 26px")}>
              Правильних відповідей: <b style={{ color: "#14b8a6" }}>{s.correct} з {total}</b>
            </p>
            <div style={sx("display:inline-flex;gap:14px;margin-bottom:30px")}>
              <div style={sx("padding:16px 26px;border-radius:20px;background:#fff;box-shadow:inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 7px rgba(255,255,255,.9),0 10px 22px -12px rgba(17,74,68,.2)")}>
                <div className="disp" style={sx("font-size:26px;font-weight:800;color:#14b8a6")}>+{s.earned}</div>
                <div style={sx("font-size:12.5px;color:#8b9c97;font-weight:700")}>XP отримано</div>
              </div>
              <div style={sx("padding:16px 26px;border-radius:20px;background:#fff;box-shadow:inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 7px rgba(255,255,255,.9),0 10px 22px -12px rgba(17,74,68,.2)")}>
                <div className="disp" style={sx("font-size:26px;font-weight:800;color:#f2994a")}>
                  {s.streak} <Icon name="fa-solid fa-fire" style={sx("font-size:20px")} />
                </div>
                <div style={sx("font-size:12.5px;color:#8b9c97;font-weight:700")}>днів поспіль</div>
              </div>
            </div>
            <div style={sx("display:flex;flex-wrap:wrap;gap:12px;justify-content:center")}>
              {s.activeId < TOTAL_LESSONS && (
                <button onClick={goNextLesson} style={sx("padding:15px 30px;border:none;cursor:pointer;border-radius:18px;font-weight:800;font-size:16px;color:#fff;background:#14b8a6;box-shadow:0 14px 26px -10px rgba(20,184,166,.6),inset 0 -5px 10px rgba(6,95,85,.4),inset 0 5px 9px rgba(255,255,255,.32)")}>
                  Наступний урок <Icon name="fa-solid fa-arrow-right" />
                </button>
              )}
              <button onClick={() => go("roadmap")} style={sx(`padding:15px 30px;border:none;cursor:pointer;border-radius:18px;font-weight:800;font-size:16px;${s.activeId < TOTAL_LESSONS ? "color:#0f9c8c;background:#fff;box-shadow:inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 7px rgba(255,255,255,.9),0 8px 18px -10px rgba(17,74,68,.2)" : "color:#fff;background:#14b8a6;box-shadow:0 14px 26px -10px rgba(20,184,166,.6),inset 0 -5px 10px rgba(6,95,85,.4),inset 0 5px 9px rgba(255,255,255,.32)"}`)}>
                Далі до карти <Icon name="fa-solid fa-arrow-right" />
              </button>
              <button onClick={() => go("progress")} style={sx("padding:15px 30px;border:none;cursor:pointer;border-radius:18px;font-weight:800;font-size:16px;color:#0f9c8c;background:#fff;box-shadow:inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 7px rgba(255,255,255,.9),0 8px 18px -10px rgba(17,74,68,.2)")}>
                Мій прогрес
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={sx("display:flex;align-items:center;gap:6px;margin-bottom:18px")}>
              {Array.from({ length: total }).map((_, i) => {
                let bg = "#e0e8e5";
                if (i < s.quizIndex) bg = "#14b8a6";
                else if (i === s.quizIndex) bg = "#2dd4bf";
                return <div key={i} style={sx(`flex:1;height:9px;border-radius:8px;background:${bg};box-shadow:inset 0 1px 3px rgba(17,74,68,.15);`)} />;
              })}
              <span style={sx("margin-left:auto;font-weight:800;color:#8b9c97;font-size:14px")}>Питання {s.quizIndex + 1} / {total}</span>
            </div>
            {isCmd ? CommandQuestion() : McqQuestion()}
          </>
        )}
      </main>
    );
  };

  // ---------- progress ----------
  const Progress = () => {
    const level = Math.floor(s.xp / 500) + 1;
    const into = s.xp % 500;
    const levelPct = Math.round((into / 500) * 100);
    const toNext = 500 - into;
    const ringBg = `conic-gradient(#14b8a6 ${levelPct}%, #dbe6e2 0)`;

    const badges = BADGE_DEFS.map((b) => {
      const earned = doneCount >= b.need;
      const cardStyle =
        "display:flex;flex-direction:column;align-items:center;text-align:center;padding:18px 12px;border-radius:20px;background:#fff;" +
        (earned
          ? "box-shadow:inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 7px rgba(255,255,255,.9),0 10px 22px -14px rgba(17,74,68,.25);"
          : "opacity:.55;box-shadow:inset 0 -3px 6px rgba(17,74,68,.04),inset 0 3px 5px rgba(255,255,255,.8);");
      const iconWrap =
        "display:grid;place-items:center;width:52px;height:52px;border-radius:16px;font-size:22px;" +
        (earned
          ? "color:#fff;background:#14b8a6;box-shadow:0 9px 16px -6px rgba(20,184,166,.55),inset 0 -4px 8px rgba(6,95,85,.35),inset 0 4px 7px rgba(255,255,255,.3);"
          : "color:#a7b6b1;background:#e6ece9;box-shadow:inset 0 -3px 6px rgba(17,74,68,.06),inset 0 3px 5px rgba(255,255,255,.8);");
      return { icon: earned ? b.icon : "fa-solid fa-lock", name: b.name, desc: b.desc, cardStyle, iconWrap, textColor: earned ? "" : "color:#a7b6b1;" };
    });

    // Рейтинг — лише наші 5 відділів. XP кожного беремо з його збереженого
    // прогресу (поточний акаунт — з активного стану).
    const rows = ACCOUNTS.map((acc) => {
      const you = s.user?.key === acc.key;
      const xp = you ? s.xp : loadProgress(acc.key)?.xp ?? 0;
      return { name: acc.name, color: acc.color, icon: acc.icon as string | undefined, xp, you };
    });
    rows.sort((a, b) => b.xp - a.xp);
    let rank = 1;
    const leaderboard = rows.map((l, i) => {
      const rk = i + 1;
      if (l.you) rank = rk;
      const rowStyle = "display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid #eef3f1;" + (l.you ? "background:#eafaf7;" : "");
      let rankStyle = "display:grid;place-items:center;width:30px;height:30px;border-radius:10px;font-weight:800;font-size:14px;";
      if (rk === 1) rankStyle += "background:#ffd76a;color:#8a6a10;";
      else if (rk === 2) rankStyle += "background:#dbe3e0;color:#5b6d68;";
      else if (rk === 3) rankStyle += "background:#e6c48a;color:#7a5a1e;";
      else rankStyle += "background:#eef3f1;color:#8b9c97;";
      return { rank: rk, name: l.you ? l.name + " (ви)" : l.name, initials: "", color: l.color, xp: l.xp, rowStyle, rankStyle, icon: l.icon };
    });

    return (
      <main style={sx("flex:1;max-width:900px;margin:0 auto;width:100%;padding:34px 24px 90px;animation:floatUp .4s ease")}>
        <h1 className="disp" style={sx("font-size:34px;font-weight:800;letter-spacing:-.7px;margin-bottom:22px")}>Мій прогрес</h1>
        <div style={sx("display:grid;grid-template-columns:300px 1fr;gap:20px;margin-bottom:22px")}>
          <div style={sx("display:flex;flex-direction:column;align-items:center;padding:26px;border-radius:26px;background:#fff;box-shadow:0 16px 34px -18px rgba(17,74,68,.3),inset 0 -5px 11px rgba(17,74,68,.045),inset 0 6px 11px rgba(255,255,255,.9)")}>
            <div style={sx(`position:relative;width:170px;height:170px;border-radius:50%;display:grid;place-items:center;background:${ringBg};box-shadow:inset 0 3px 10px rgba(17,74,68,.12)`)}>
              <div style={sx("width:128px;height:128px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 6px 14px -6px rgba(17,74,68,.3),inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 8px rgba(255,255,255,.9)")}>
                <div style={sx("text-align:center")}>
                  <div style={sx("font-size:12px;font-weight:700;color:#8b9c97")}>РІВЕНЬ</div>
                  <div className="disp" style={sx("font-size:46px;font-weight:800;color:#14b8a6;line-height:1")}>{level}</div>
                </div>
              </div>
            </div>
            <div style={sx("margin-top:16px;font-weight:800;font-size:17px")}>{user.name}</div>
            <div style={sx("color:#8b9c97;font-weight:700;font-size:13.5px;margin-bottom:2px")}>{user.role}</div>
            <div style={sx("margin-top:6px;font-size:13.5px;color:#5b6d68;font-weight:700")}>
              Ще <b style={{ color: "#14b8a6" }}>{toNext} XP</b> до рівня {level + 1}
            </div>
          </div>
          <div style={sx("display:grid;grid-template-columns:repeat(2,1fr);gap:14px")}>
            <div style={sx("padding:20px;border-radius:22px;background:#fff;box-shadow:inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 7px rgba(255,255,255,.9),0 10px 22px -13px rgba(17,74,68,.2)")}>
              <Icon name="fa-solid fa-bolt" style={sx("color:#14b8a6;font-size:22px")} />
              <div className="disp" style={sx("font-size:30px;font-weight:800;margin-top:8px")}>{s.xp}</div>
              <div style={sx("color:#8b9c97;font-weight:700;font-size:13.5px")}>всього XP</div>
            </div>
            <div style={sx("padding:20px;border-radius:22px;background:#fff;box-shadow:inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 7px rgba(255,255,255,.9),0 10px 22px -13px rgba(17,74,68,.2)")}>
              <Icon name="fa-solid fa-fire" style={sx("color:#f2994a;font-size:22px")} />
              <div className="disp" style={sx("font-size:30px;font-weight:800;margin-top:8px")}>{s.streak}</div>
              <div style={sx("color:#8b9c97;font-weight:700;font-size:13.5px")}>днів поспіль</div>
            </div>
            <div style={sx("padding:20px;border-radius:22px;background:#fff;box-shadow:inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 7px rgba(255,255,255,.9),0 10px 22px -13px rgba(17,74,68,.2)")}>
              <Icon name="fa-solid fa-graduation-cap" style={sx("color:#7c6ee0;font-size:22px")} />
              <div className="disp" style={sx("font-size:30px;font-weight:800;margin-top:8px")}>{doneCount}/{TOTAL_LESSONS}</div>
              <div style={sx("color:#8b9c97;font-weight:700;font-size:13.5px")}>модулів пройдено</div>
            </div>
            <div style={sx("padding:20px;border-radius:22px;background:#fff;box-shadow:inset 0 -4px 8px rgba(17,74,68,.05),inset 0 4px 7px rgba(255,255,255,.9),0 10px 22px -13px rgba(17,74,68,.2)")}>
              <Icon name="fa-solid fa-ranking-star" style={sx("color:#e0a03e;font-size:22px")} />
              <div className="disp" style={sx("font-size:30px;font-weight:800;margin-top:8px")}>#{rank}</div>
              <div style={sx("color:#8b9c97;font-weight:700;font-size:13.5px")}>місце в рейтингу</div>
            </div>
          </div>
        </div>

        <h2 className="disp" style={sx("font-size:22px;font-weight:800;margin:24px 0 14px")}>Бейджі</h2>
        <div style={sx("display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:8px")}>
          {badges.map((b, i) => (
            <div key={i} style={sx(b.cardStyle)}>
              <span style={sx(b.iconWrap)}>
                <Icon name={b.icon} />
              </span>
              <div style={sx(`font-weight:800;font-size:13.5px;margin-top:10px;${b.textColor}`)}>{b.name}</div>
              <div style={sx("font-size:11.5px;color:#a7b6b1;font-weight:600;margin-top:2px;line-height:1.3")}>{b.desc}</div>
            </div>
          ))}
        </div>

        {showLeaderboard && (
          <>
            <h2 className="disp" style={sx("font-size:22px;font-weight:800;margin:28px 0 14px")}>Рейтинг команди</h2>
            <div style={sx("border-radius:24px;background:#fff;overflow:hidden;box-shadow:0 14px 32px -18px rgba(17,74,68,.3),inset 0 -5px 11px rgba(17,74,68,.045),inset 0 6px 11px rgba(255,255,255,.9)")}>
              {leaderboard.map((l, i) => (
                <div key={i} style={sx(l.rowStyle)}>
                  <span style={sx(l.rankStyle)}>{l.rank}</span>
                  <span style={sx(`display:grid;place-items:center;width:42px;height:42px;border-radius:50%;font-weight:800;color:${l.icon ? "#fff" : "#14332f"};font-size:${l.icon ? "17px" : "15px"};background:${l.color};box-shadow:inset 0 -3px 6px rgba(0,0,0,.08),inset 0 3px 5px rgba(255,255,255,.4)`)}>
                    {l.icon ? <Icon name={l.icon} /> : l.initials}
                  </span>
                  <span style={sx("font-weight:800;font-size:15px")}>{l.name}</span>
                  <span style={sx("margin-left:auto;font-weight:800;color:#14b8a6")}>
                    <Icon name="fa-solid fa-bolt" style={sx("font-size:13px")} /> {l.xp}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    );
  };

  // Викликаємо як функції (не як <Компонент/>), щоб контрольовані інпути
  // не втрачали фокус через ремоунт при кожному оновленні стану.
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {Header()}
      {s.screen === "login" && Login()}
      {s.screen === "roadmap" && Roadmap()}
      {s.screen === "trainer" && Trainer()}
      {s.screen === "sandbox" && Sandbox()}
      {s.screen === "cli" && Cli()}
      {s.screen === "lesson" && Lesson()}
      {s.screen === "quiz" && Quiz()}
      {s.screen === "progress" && Progress()}
    </div>
  );
}
