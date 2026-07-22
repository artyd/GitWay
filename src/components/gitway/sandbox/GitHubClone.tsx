"use client";

import { useState } from "react";
import { sx } from "@/lib/sx";
import { Icon } from "../ui";
import type { GitEngine } from "@/lib/git-engine/store";
import { useEngineVersion } from "@/lib/git-engine/react/useEngine";
import {
  computeStatus,
  commitHistory,
  headCommitOid,
  readBlob,
  readCommit,
  treeToMap,
  treeDiff,
  short,
  createPullRequest,
  mergePullRequest,
  closePullRequest,
  addPrComment,
  addPrReview,
  prCommits,
  prDiffTrees,
  type Repo,
  type PullRequest,
} from "@/lib/git-engine";
import { HOME } from "@/lib/git-engine/types";
import { DiffView } from "./DiffView";
import { CommitGraph } from "./CommitGraph";

type View = "code" | "commits" | "branches" | "pulls" | "changes";

const card = "background:#fff;border-radius:18px;box-shadow:0 12px 30px -20px rgba(17,74,68,.3),inset 0 -4px 9px rgba(17,74,68,.04),inset 0 5px 9px rgba(255,255,255,.9);";
const btn = "display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border:none;cursor:pointer;border-radius:12px;font-weight:800;font-size:13px;color:#0d7d70;background:#d8f3ee;transition:all .15s;";
const btnPrimary = "display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border:none;cursor:pointer;border-radius:12px;font-weight:800;font-size:13px;color:#fff;background:#14b8a6;box-shadow:0 8px 16px -7px rgba(20,184,166,.6);";
const btnGhost = "display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border:none;cursor:pointer;border-radius:11px;font-weight:700;font-size:12.5px;color:#5b6d68;background:#f1f5f3;";
const inp = "width:100%;padding:10px 13px;border:none;border-radius:12px;background:#f1f5f3;box-shadow:inset 0 2px 5px rgba(17,74,68,.08);font-size:13.5px;font-family:inherit;outline:none;color:#14332f;";

export function GitHubClone({ engine, account }: { engine: GitEngine; account: string }) {
  useEngineVersion(engine);
  const [view, setView] = useState<View>("code");
  const repo = engine.repo();

  if (!repo || !repo.initialized) {
    return <NoRepo engine={engine} />;
  }

  const branch = repo.head.type === "branch" ? repo.head.branch : "HEAD (відʼєднано)";
  const tabs: { k: View; label: string; icon: string }[] = [
    { k: "code", label: "Код", icon: "fa-solid fa-code" },
    { k: "commits", label: "Коміти", icon: "fa-solid fa-code-commit" },
    { k: "branches", label: "Гілки", icon: "fa-solid fa-code-branch" },
    { k: "pulls", label: "Pull Requests", icon: "fa-solid fa-code-pull-request" },
    { k: "changes", label: "Зміни", icon: "fa-solid fa-pen" },
  ];
  const st = computeStatus(repo);
  const changeCount = st.staged.length + st.unstaged.length + st.untracked.length + st.conflicts.length;

  return (
    <div style={sx("display:flex;flex-direction:column;gap:14px;height:100%;min-height:0")}>
      <RepoBar engine={engine} repo={repo} branch={branch} />
      <div style={sx("display:flex;gap:5px;flex-wrap:wrap")}>
        {tabs.map((t) => {
          const on = view === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setView(t.k)}
              style={sx(
                "display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border:none;cursor:pointer;border-radius:12px;font-weight:800;font-size:13px;transition:all .15s;" +
                  (on ? "color:#0d7d70;background:#d8f3ee;" : "color:#7d8f8a;background:transparent;"),
              )}
            >
              <Icon name={t.icon} /> {t.label}
              {t.k === "changes" && changeCount > 0 && (
                <span style={sx("display:grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#f2994a;color:#fff;font-size:11px")}>
                  {changeCount}
                </span>
              )}
              {t.k === "pulls" && repo.pullRequests.some((p) => p.state === "open") && (
                <span style={sx("display:grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#22a06b;color:#fff;font-size:11px")}>
                  {repo.pullRequests.filter((p) => p.state === "open").length}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div style={sx("flex:1;min-height:0;overflow-y:auto;padding-right:2px")}>
        {view === "code" && <CodeBrowser engine={engine} repo={repo} />}
        {view === "commits" && <CommitsView repo={repo} />}
        {view === "branches" && <BranchesView engine={engine} repo={repo} />}
        {view === "pulls" && <PullsView engine={engine} repo={repo} account={account} />}
        {view === "changes" && <ChangesView engine={engine} repo={repo} />}
      </div>
    </div>
  );
}

// ---------- порожній стан ----------
function NoRepo({ engine }: { engine: GitEngine }) {
  const [name, setName] = useState("");
  const create = () => {
    const n = name.trim().replace(/\s+/g, "-");
    if (!n) return;
    engine.exec("cd " + HOME);
    engine.exec("mkdir " + n);
    engine.exec("cd " + n);
    engine.exec("git init");
    setName("");
  };
  return (
    <div style={sx(card + "padding:30px;text-align:center")}>
      <Icon name="fa-brands fa-github" style={sx("font-size:40px;color:#14b8a6")} />
      <h3 className="disp" style={sx("font-size:20px;font-weight:800;margin:12px 0 6px")}>Тут ще немає репозиторію</h3>
      <p style={sx("color:#5b6d68;font-size:14px;margin:0 0 16px")}>Створіть його або виконайте <b>git init</b> у терміналі.</p>
      <div style={sx("display:flex;gap:8px;max-width:340px;margin:0 auto")}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="назва-репозиторію" style={sx(inp)} />
        <button onClick={create} style={sx(btnPrimary)}><Icon name="fa-solid fa-plus" /> Створити</button>
      </div>
    </div>
  );
}

// ---------- шапка репо ----------
function RepoBar({ engine, repo, branch }: { engine: GitEngine; repo: Repo; branch: string }) {
  const repos = engine.allRepos();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const switchRepo = (r: Repo) => engine.exec("cd " + r.root);
  const createRepo = () => {
    const n = name.trim().replace(/\s+/g, "-");
    if (!n) return;
    engine.exec("cd " + HOME);
    engine.exec("mkdir " + n);
    engine.exec("cd " + n);
    engine.exec("git init");
    setName("");
    setCreating(false);
  };
  const branches = Object.keys(repo.branches);
  return (
    <div style={sx(card + "padding:14px 16px")}>
      <div style={sx("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
        <Icon name="fa-solid fa-book-bookmark" style={sx("color:#14b8a6;font-size:17px")} />
        <select
          value={repo.id}
          onChange={(e) => {
            const r = repos.find((x) => x.id === e.target.value);
            if (r) switchRepo(r);
          }}
          style={sx("font-weight:800;font-size:15px;color:#0f9c8c;border:none;background:#f1f5f3;border-radius:10px;padding:6px 10px;cursor:pointer;outline:none")}
        >
          {repos.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <span style={sx("display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;background:#eef4f2;color:#5b6d68;font-size:12.5px;font-weight:800")}>
          <Icon name="fa-solid fa-code-branch" />
          <select
            value={repo.head.type === "branch" ? repo.head.branch : ""}
            onChange={(e) => engine.exec("git checkout " + e.target.value)}
            style={sx("border:none;background:none;font-weight:800;color:#5b6d68;cursor:pointer;outline:none;font-size:12.5px")}
          >
            {repo.head.type !== "branch" && <option value="">{branch}</option>}
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </span>
        <span style={sx("color:#a7b6b1;font-size:12.5px;font-weight:700")}>{branches.length} гілок · {countCommits(repo)} комітів</span>
        <div style={sx("margin-left:auto;display:flex;gap:8px")}>
          {creating ? (
            <>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="назва" style={sx(inp + "width:130px")} autoFocus />
              <button onClick={createRepo} style={sx(btnPrimary)}>OK</button>
              <button onClick={() => setCreating(false)} style={sx(btnGhost)}>✕</button>
            </>
          ) : (
            <button onClick={() => setCreating(true)} style={sx(btn)}><Icon name="fa-solid fa-plus" /> Новий репозиторій</button>
          )}
        </div>
      </div>
    </div>
  );
}

function countCommits(repo: Repo): number {
  const head = headCommitOid(repo);
  return head ? commitHistory(repo, head).length : 0;
}

// ---------- перегляд коду (файловий браузер) ----------
function CodeBrowser({ engine, repo }: { engine: GitEngine; repo: Repo }) {
  const [path, setPath] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const head = headCommitOid(repo);
  const tree = head ? readCommit(repo, head)?.tree ?? null : null;
  const map = treeToMap(repo, tree);
  const paths = Object.keys(map);

  if (!head) {
    return <div style={sx(card + "padding:24px;text-align:center;color:#8b9c97")}>Порожній репозиторій — зробіть перший коміт.</div>;
  }

  if (file) {
    const content = readBlob(repo, map[file])?.content ?? "";
    return (
      <div style={sx(card + "overflow:hidden")}>
        <div style={sx("display:flex;align-items:center;gap:10px;padding:12px 16px;background:#f5f8f7;border-bottom:1px solid #e4ebe8")}>
          <button onClick={() => setFile(null)} style={sx(btnGhost)}><Icon name="fa-solid fa-arrow-left" /> Назад</button>
          <span style={sx("font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:13.5px")}>{file}</span>
          <span style={sx("margin-left:auto;color:#a7b6b1;font-size:12px")}>{content.split("\n").length} рядків</span>
        </div>
        <pre style={{ ...sx("margin:0;padding:16px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px;line-height:1.6;overflow-x:auto;color:#3f524e"), whiteSpace: "pre" }}>
          {content || "(порожній файл)"}
        </pre>
      </div>
    );
  }

  const prefix = path ? path + "/" : "";
  const dirs = new Set<string>();
  const files: string[] = [];
  for (const p of paths) {
    if (!p.startsWith(prefix)) continue;
    const rest = p.slice(prefix.length);
    if (rest.includes("/")) dirs.add(rest.split("/")[0]);
    else files.push(rest);
  }

  return (
    <div style={sx(card + "overflow:hidden")}>
      <div style={sx("display:flex;align-items:center;gap:8px;padding:12px 16px;background:#f5f8f7;border-bottom:1px solid #e4ebe8;font-size:13px;font-weight:700")}>
        <button onClick={() => setPath("")} style={sx("border:none;background:none;cursor:pointer;color:#0f9c8c;font-weight:800")}>{repo.name}</button>
        {path.split("/").filter(Boolean).map((seg, i, arr) => (
          <span key={i}>
            <span style={sx("color:#c3d0cc")}>/</span>{" "}
            <button
              onClick={() => setPath(arr.slice(0, i + 1).join("/"))}
              style={sx("border:none;background:none;cursor:pointer;color:#0f9c8c;font-weight:800")}
            >
              {seg}
            </button>
          </span>
        ))}
        <span style={sx("margin-left:auto")}>
          <button onClick={() => engine.exec("git log --oneline")} style={sx("border:none;background:none;cursor:default;color:#a7b6b1;font-weight:700;font-size:12px")}>
            <Icon name="fa-solid fa-code-commit" /> {firstMsg(repo)}
          </button>
        </span>
      </div>
      {path && (
        <button onClick={() => setPath(parentPath(path))} style={sx("display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:11px 18px;border:none;border-bottom:1px solid #eef3f1;cursor:pointer;background:#fff;font-weight:700;color:#8b9c97")}>
          <Icon name="fa-solid fa-turn-up" /> ..
        </button>
      )}
      {Array.from(dirs).sort().map((d) => (
        <button key={d} onClick={() => setPath(prefix + d)} style={sx("display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:11px 18px;border:none;border-bottom:1px solid #eef3f1;cursor:pointer;background:#fff")}>
          <Icon name="fa-solid fa-folder" style={sx("color:#e6a15a")} />
          <span style={sx("font-weight:700;font-size:14px")}>{d}</span>
        </button>
      ))}
      {files.sort().map((f) => (
        <button key={f} onClick={() => setFile(prefix + f)} style={sx("display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:11px 18px;border:none;border-bottom:1px solid #eef3f1;cursor:pointer;background:#fff")}>
          <Icon name="fa-solid fa-file-lines" style={sx("color:#8b9c97")} />
          <span style={sx("font-weight:600;font-size:14px")}>{f}</span>
        </button>
      ))}
      {dirs.size === 0 && files.length === 0 && (
        <div style={sx("padding:20px;text-align:center;color:#a7b6b1")}>Порожня тека</div>
      )}
    </div>
  );
}
function parentPath(p: string): string {
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}
function firstMsg(repo: Repo): string {
  const head = headCommitOid(repo);
  const c = head ? readCommit(repo, head) : null;
  return c ? short(c.oid) + " " + c.message.split("\n")[0] : "";
}

// ---------- коміти ----------
function CommitsView({ repo }: { repo: Repo }) {
  const head = headCommitOid(repo);
  const commits = head ? commitHistory(repo, head) : [];
  const [sel, setSel] = useState<string | null>(commits[0]?.oid ?? null);
  if (!commits.length) return <div style={sx(card + "padding:24px;text-align:center;color:#8b9c97")}>Ще немає комітів.</div>;
  const selCommit = sel ? readCommit(repo, sel) : null;
  const changes = selCommit ? treeDiff(repo, selCommit.parents[0] ? readCommit(repo, selCommit.parents[0])?.tree ?? null : null, selCommit.tree) : [];

  return (
    <div style={sx("display:flex;flex-direction:column;gap:14px")}>
      <div style={sx(card + "overflow:hidden")}>
        {commits.map((c) => (
          <button
            key={c.oid}
            onClick={() => setSel(c.oid)}
            style={sx(
              "display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 16px;border:none;border-bottom:1px solid #eef3f1;cursor:pointer;" +
                (c.oid === sel ? "background:#eafaf7;" : "background:#fff;"),
            )}
          >
            <span style={sx("display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:#d8f3ee;color:#0d7d70;flex:none")}>
              <Icon name={c.parents.length > 1 ? "fa-solid fa-code-merge" : "fa-solid fa-code-commit"} />
            </span>
            <div style={sx("flex:1;min-width:0")}>
              <div style={sx("font-weight:700;font-size:14px;color:#14332f;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{c.message.split("\n")[0]}</div>
              <div style={sx("font-size:12px;color:#8b9c97")}>{c.author.name} · {new Date(c.author.when).toLocaleString("uk-UA")}</div>
            </div>
            <span style={sx("font-family:ui-monospace,Menlo,monospace;font-size:12px;font-weight:700;color:#a7b6b1;flex:none")}>{short(c.oid)}</span>
          </button>
        ))}
      </div>
      {selCommit && (
        <div>
          <div style={sx("font-weight:800;font-size:14px;color:#5b6d68;margin-bottom:10px")}>
            Зміни у коміті {short(selCommit.oid)}
          </div>
          <DiffView changes={changes} />
        </div>
      )}
    </div>
  );
}

// ---------- гілки ----------
function BranchesView({ engine, repo }: { engine: GitEngine; repo: Repo }) {
  const [sel, setSel] = useState<string | null>(headCommitOid(repo));
  const [newBranch, setNewBranch] = useState("");
  const cur = repo.head.type === "branch" ? repo.head.branch : null;
  const branches = Object.keys(repo.branches).sort();

  return (
    <div style={sx("display:flex;flex-direction:column;gap:14px")}>
      <div style={sx(card + "padding:14px 16px")}>
        <div style={sx("display:flex;gap:8px;margin-bottom:12px")}>
          <input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="нова-гілка" style={sx(inp)} />
          <button
            onClick={() => {
              const n = newBranch.trim().replace(/\s+/g, "-");
              if (n) engine.exec("git checkout -b " + n);
              setNewBranch("");
            }}
            style={sx(btnPrimary)}
          >
            <Icon name="fa-solid fa-code-branch" /> Створити
          </button>
        </div>
        <div style={sx("display:flex;flex-direction:column;gap:8px")}>
          {branches.map((b) => {
            const isCur = b === cur;
            return (
              <div key={b} style={sx("display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;background:" + (isCur ? "#eafaf7" : "#f7faf9"))}>
                <Icon name="fa-solid fa-code-branch" style={sx("color:" + (isCur ? "#14b8a6" : "#8b9c97"))} />
                <span style={sx("font-weight:800;font-size:13.5px")}>{b}</span>
                {isCur && <span style={sx("padding:2px 9px;border-radius:20px;background:#14b8a6;color:#fff;font-size:11px;font-weight:800")}>поточна</span>}
                <span style={sx("font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:#a7b6b1")}>{short(repo.branches[b])}</span>
                <div style={sx("margin-left:auto;display:flex;gap:6px")}>
                  {!isCur && <button onClick={() => engine.exec("git checkout " + b)} style={sx(btnGhost)}>Перейти</button>}
                  {!isCur && cur && <button onClick={() => engine.exec("git merge " + b)} style={sx(btnGhost)}><Icon name="fa-solid fa-code-merge" /> Влити</button>}
                  {!isCur && (
                    <button
                      onClick={() => {
                        if (confirm("Видалити гілку " + b + "?")) engine.exec("git branch -D " + b);
                      }}
                      style={sx(btnGhost + "color:#c0392b")}
                    >
                      <Icon name="fa-solid fa-trash" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={sx(card + "padding:8px")}>
        <div style={sx("font-weight:800;font-size:13px;color:#5b6d68;padding:8px 10px")}>Граф комітів</div>
        <CommitGraph repo={repo} selected={sel} onSelect={setSel} />
      </div>
    </div>
  );
}

// ---------- зміни / staging ----------
function ChangesView({ engine, repo }: { engine: GitEngine; repo: Repo }) {
  const st = computeStatus(repo);
  const [msg, setMsg] = useState("");
  const clean = !st.staged.length && !st.unstaged.length && !st.untracked.length && !st.conflicts.length;

  const row = (path: string, label: string, color: string, actions: React.ReactNode) => (
    <div key={label + path} style={sx("display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:11px;background:#f7faf9")}>
      <span style={sx(`width:8px;height:8px;border-radius:50%;background:${color};flex:none`)} />
      <span style={sx("font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:600")}>{path}</span>
      <span style={sx("font-size:11.5px;color:#a7b6b1;font-weight:700")}>{label}</span>
      <div style={sx("margin-left:auto;display:flex;gap:6px")}>{actions}</div>
    </div>
  );

  return (
    <div style={sx("display:flex;flex-direction:column;gap:14px")}>
      {clean && (
        <div style={sx(card + "padding:22px;text-align:center;color:#0d7d70;font-weight:700")}>
          <Icon name="fa-solid fa-circle-check" /> Робоче дерево чисте — усе збережено.
        </div>
      )}

      {st.conflicts.length > 0 && (
        <div style={sx(card + "padding:14px;border:1px solid #f3c2bd")}>
          <div style={sx("font-weight:800;color:#c0392b;margin-bottom:8px")}><Icon name="fa-solid fa-triangle-exclamation" /> Конфлікти злиття</div>
          {st.conflicts.map((p) =>
            row(p, "конфлікт", "#c0392b", (
              <button onClick={() => engine.exec("git add " + p)} style={sx(btnGhost)}>Позначити вирішеним</button>
            )),
          )}
          <p style={sx("margin:8px 4px 0;font-size:12.5px;color:#8b9c97")}>Відредагуйте файли в терміналі (приберіть маркери <b>{"<<<<<<<"}</b>), потім позначте вирішеними.</p>
        </div>
      )}

      {st.staged.length > 0 && (
        <div style={sx(card + "padding:14px")}>
          <div style={sx("display:flex;align-items:center;margin-bottom:10px")}>
            <span style={sx("font-weight:800;color:#0d7d70")}>Проіндексовано ({st.staged.length})</span>
            <button onClick={() => engine.exec("git reset")} style={sx(btnGhost + "margin-left:auto")}>Прибрати все</button>
          </div>
          <div style={sx("display:flex;flex-direction:column;gap:7px")}>
            {st.staged.map((s) =>
              row(s.path, kindLabel(s.kind), "#22a06b", (
                <button onClick={() => engine.exec("git reset " + s.path)} style={sx(btnGhost)}>Прибрати</button>
              )),
            )}
          </div>
        </div>
      )}

      {(st.unstaged.length > 0 || st.untracked.length > 0) && (
        <div style={sx(card + "padding:14px")}>
          <div style={sx("display:flex;align-items:center;margin-bottom:10px")}>
            <span style={sx("font-weight:800;color:#c3a24a")}>Зміни ({st.unstaged.length + st.untracked.length})</span>
            <button onClick={() => engine.exec("git add -A")} style={sx(btn + "margin-left:auto")}><Icon name="fa-solid fa-plus" /> Проіндексувати все</button>
          </div>
          <div style={sx("display:flex;flex-direction:column;gap:7px")}>
            {st.unstaged.map((s) =>
              row(s.path, kindLabel(s.kind), "#c3a24a", (
                <button onClick={() => engine.exec("git add " + s.path)} style={sx(btnGhost)}>+</button>
              )),
            )}
            {st.untracked.map((p) =>
              row(p, "новий", "#8b9c97", <button onClick={() => engine.exec("git add " + p)} style={sx(btnGhost)}>+</button>),
            )}
          </div>
        </div>
      )}

      {(st.staged.length > 0 || repo.mergeHead) && (
        <div style={sx(card + "padding:14px")}>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Опишіть, що змінили…"
            rows={2}
            style={{ ...sx(inp), resize: "vertical" }}
          />
          <button
            onClick={() => {
              const m = msg.trim() || (repo.mergeHead ? "Merge" : "");
              if (!m) return;
              engine.exec('git commit -m "' + m.replace(/"/g, '\\"') + '"');
              setMsg("");
            }}
            style={sx(btnPrimary + "margin-top:10px;width:100%;justify-content:center;padding:12px")}
          >
            <Icon name="fa-solid fa-code-commit" /> Зробити коміт у «{repo.head.type === "branch" ? repo.head.branch : "HEAD"}»
          </button>
        </div>
      )}
    </div>
  );
}
function kindLabel(k: string): string {
  return k === "new" ? "новий" : k === "deleted" ? "видалено" : "змінено";
}

// ---------- pull requests ----------
function PullsView({ engine, repo, account }: { engine: GitEngine; repo: Repo; account: string }) {
  const [openPr, setOpenPr] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  if (creating) return <CreatePr engine={engine} repo={repo} account={account} onDone={() => setCreating(false)} />;
  if (openPr !== null) {
    const pr = repo.pullRequests.find((p) => p.number === openPr);
    if (pr) return <PrDetail engine={engine} repo={repo} pr={pr} account={account} onBack={() => setOpenPr(null)} />;
  }

  const prs = repo.pullRequests;
  return (
    <div style={sx("display:flex;flex-direction:column;gap:12px")}>
      <div style={sx("display:flex;align-items:center")}>
        <span style={sx("font-weight:800;color:#5b6d68")}>{prs.filter((p) => p.state === "open").length} відкритих</span>
        <button onClick={() => setCreating(true)} style={sx(btnPrimary + "margin-left:auto")}><Icon name="fa-solid fa-code-pull-request" /> Новий Pull Request</button>
      </div>
      {!prs.length && <div style={sx(card + "padding:24px;text-align:center;color:#8b9c97")}>Ще немає жодного pull request.</div>}
      {prs.map((pr) => (
        <button key={pr.number} onClick={() => setOpenPr(pr.number)} style={sx(card + "padding:14px 16px;display:flex;align-items:center;gap:12px;text-align:left;border:none;cursor:pointer;width:100%")}>
          <Icon name={prIcon(pr)} style={sx("font-size:18px;color:" + prColor(pr))} />
          <div style={sx("flex:1;min-width:0")}>
            <div style={sx("font-weight:800;font-size:14.5px;color:#14332f")}>{pr.title} <span style={sx("color:#a7b6b1;font-weight:700")}>#{pr.number}</span></div>
            <div style={sx("font-size:12.5px;color:#8b9c97")}>
              <span style={sx("font-family:ui-monospace,Menlo,monospace")}>{pr.sourceBranch}</span> → <span style={sx("font-family:ui-monospace,Menlo,monospace")}>{pr.targetBranch}</span> · {pr.author}
            </div>
          </div>
          <span style={sx("padding:3px 11px;border-radius:20px;font-size:11px;font-weight:800;color:#fff;background:" + prColor(pr))}>{prState(pr)}</span>
        </button>
      ))}
    </div>
  );
}
function prIcon(pr: PullRequest) {
  return pr.state === "merged" ? "fa-solid fa-code-merge" : pr.state === "closed" ? "fa-solid fa-code-pull-request-closed" : "fa-solid fa-code-pull-request";
}
function prColor(pr: PullRequest) {
  return pr.state === "merged" ? "#8250df" : pr.state === "closed" ? "#c0392b" : "#22a06b";
}
function prState(pr: PullRequest) {
  return pr.state === "merged" ? "Злито" : pr.state === "closed" ? "Закрито" : "Відкрито";
}

function CreatePr({ engine, repo, account, onDone }: { engine: GitEngine; repo: Repo; account: string; onDone: () => void }) {
  const branches = Object.keys(repo.branches);
  const cur = repo.head.type === "branch" ? repo.head.branch : branches[0];
  const [source, setSource] = useState(cur);
  const [target, setTarget] = useState(repo.config.defaultBranch in repo.branches ? repo.config.defaultBranch : branches.find((b) => b !== cur) ?? cur);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    let out: { error: string } | { number: number } = { error: "" };
    engine.mutate(() => {
      const res = createPullRequest(repo, source, target, title.trim(), body.trim(), account, engine.now);
      out = "error" in res ? res : { number: res.number };
      return res;
    });
    if ("error" in out && out.error) setError(out.error);
    else onDone();
  };

  return (
    <div style={sx(card + "padding:18px")}>
      <div style={sx("display:flex;align-items:center;gap:10px;margin-bottom:14px")}>
        <button onClick={onDone} style={sx(btnGhost)}><Icon name="fa-solid fa-arrow-left" /></button>
        <h3 className="disp" style={sx("font-size:18px;font-weight:800")}>Новий Pull Request</h3>
      </div>
      <div style={sx("display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap")}>
        <BranchSelect label="з гілки" value={source} onChange={setSource} branches={branches} />
        <Icon name="fa-solid fa-arrow-right" style={sx("color:#8b9c97")} />
        <BranchSelect label="у гілку" value={target} onChange={setTarget} branches={branches} />
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок" style={sx(inp + "margin-bottom:10px")} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Опис змін…" rows={3} style={{ ...sx(inp), resize: "vertical" }} />
      {error && <div style={sx("margin-top:10px;color:#c0392b;font-weight:700;font-size:13px")}>{error}</div>}
      <button onClick={submit} style={sx(btnPrimary + "margin-top:12px")}><Icon name="fa-solid fa-code-pull-request" /> Створити PR</button>
    </div>
  );
}
function BranchSelect({ label, value, onChange, branches }: { label: string; value: string; onChange: (v: string) => void; branches: string[] }) {
  return (
    <label style={sx("display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:#8b9c97;font-weight:700")}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={sx("border:none;background:#f1f5f3;border-radius:10px;padding:6px 10px;font-weight:800;color:#0f9c8c;cursor:pointer;outline:none;font-family:ui-monospace,Menlo,monospace;font-size:12.5px")}>
        {branches.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
    </label>
  );
}

function PrDetail({ engine, repo, pr, account, onBack }: { engine: GitEngine; repo: Repo; pr: PullRequest; account: string; onBack: () => void }) {
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const trees = prDiffTrees(repo, pr);
  const changes = treeDiff(repo, trees.base, trees.head);
  const commits = prCommits(repo, pr);
  const clock = engine.now;

  const doMerge = () => {
    let outcome = { ok: false, message: "" } as { ok: boolean; message: string; conflicts?: string[] };
    engine.mutate(() => {
      outcome = mergePullRequest(repo, pr, clock);
      return outcome;
    });
    setNotice(outcome.message);
  };
  const doClose = () => engine.mutate(() => closePullRequest(pr));
  const doComment = () => {
    const c = comment.trim();
    if (!c) return;
    engine.mutate(() => addPrComment(pr, account, c, clock));
    setComment("");
  };
  const doReview = (verdict: "approved" | "changes_requested") => {
    engine.mutate(() => addPrReview(pr, account, verdict, "", clock));
  };
  const approvals = pr.reviews.filter((r) => r.verdict === "approved").length;

  return (
    <div style={sx("display:flex;flex-direction:column;gap:14px")}>
      <div style={sx(card + "padding:16px")}>
        <div style={sx("display:flex;align-items:flex-start;gap:10px")}>
          <button onClick={onBack} style={sx(btnGhost)}><Icon name="fa-solid fa-arrow-left" /></button>
          <div style={sx("flex:1")}>
            <h3 className="disp" style={sx("font-size:18px;font-weight:800")}>{pr.title} <span style={sx("color:#a7b6b1")}>#{pr.number}</span></h3>
            <div style={sx("font-size:12.5px;color:#8b9c97;margin-top:3px")}>
              <span style={sx("padding:2px 10px;border-radius:20px;color:#fff;font-weight:800;background:" + prColor(pr))}>{prState(pr)}</span>{" "}
              <b>{pr.author}</b> хоче влити <span style={sx("font-family:ui-monospace,Menlo,monospace")}>{pr.sourceBranch}</span> у <span style={sx("font-family:ui-monospace,Menlo,monospace")}>{pr.targetBranch}</span> · {commits.length} комітів
            </div>
          </div>
        </div>
        {pr.body && <p style={sx("margin:12px 0 0;color:#3f524e;font-size:14px;line-height:1.55;white-space:pre-wrap")}>{pr.body}</p>}
        {pr.state === "open" && (
          <div style={sx("display:flex;gap:8px;margin-top:14px;flex-wrap:wrap")}>
            <button onClick={() => doReview("approved")} style={sx(btnGhost + "color:#0d7d70")}><Icon name="fa-solid fa-check" /> Схвалити</button>
            <button onClick={() => doReview("changes_requested")} style={sx(btnGhost + "color:#c3a24a")}><Icon name="fa-solid fa-pen" /> Запросити зміни</button>
            <button onClick={doMerge} style={sx(btnPrimary + "margin-left:auto")}><Icon name="fa-solid fa-code-merge" /> Влити PR</button>
            <button onClick={doClose} style={sx(btnGhost + "color:#c0392b")}>Закрити</button>
          </div>
        )}
        {notice && <div style={sx("margin-top:12px;padding:10px 14px;border-radius:12px;background:#eafaf7;color:#0d7d70;font-weight:700;font-size:13px")}>{notice}</div>}
        {approvals > 0 && <div style={sx("margin-top:10px;color:#0d7d70;font-weight:700;font-size:13px")}><Icon name="fa-solid fa-circle-check" /> Схвалень: {approvals}</div>}
      </div>

      {(pr.comments.length > 0 || pr.reviews.length > 0) && (
        <div style={sx(card + "padding:14px;display:flex;flex-direction:column;gap:10px")}>
          {[...pr.reviews, ...pr.comments].sort((a, b) => a.when - b.when).map((c) => {
            const isReview = "verdict" in c;
            return (
              <div key={c.id} style={sx("display:flex;gap:10px")}>
                <span style={sx("display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#d8f3ee;color:#0d7d70;flex:none;font-size:12px;font-weight:800")}>{c.author.slice(0, 2)}</span>
                <div style={sx("flex:1;background:#f7faf9;border-radius:12px;padding:9px 13px")}>
                  <div style={sx("font-weight:800;font-size:12.5px")}>{c.author}{isReview && reviewBadge((c as { verdict: string }).verdict)}</div>
                  {c.body && <div style={sx("font-size:13.5px;color:#3f524e;margin-top:2px")}>{c.body}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pr.state === "open" && (
        <div style={sx(card + "padding:12px")}>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Залишити коментар рецензента…" rows={2} style={{ ...sx(inp), resize: "vertical" }} />
          <button onClick={doComment} style={sx(btn + "margin-top:8px")}><Icon name="fa-solid fa-comment" /> Коментувати</button>
        </div>
      )}

      <div>
        <div style={sx("font-weight:800;font-size:14px;color:#5b6d68;margin-bottom:10px")}>Змінені файли ({changes.length})</div>
        <DiffView changes={changes} />
      </div>
    </div>
  );
}
function reviewBadge(verdict: string) {
  if (verdict === "approved") return <span style={sx("margin-left:6px;color:#0d7d70")}>схвалив ✓</span>;
  if (verdict === "changes_requested") return <span style={sx("margin-left:6px;color:#c3a24a")}>просить зміни</span>;
  return null;
}
