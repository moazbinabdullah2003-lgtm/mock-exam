# PROJECT_CONTEXT — "Quiz Server" (MCQ Mock Exam web app)  ·  READ THIS FIRST

> Folder: `/Users/mac/claude code/quiz-server` (renamed from `mock-exam-project` on 2026-11-16).
> Last full update of this file: **2026-11-16**. If something here disagrees with the code, the code wins — fix this file.
> Token-saving rule: read THIS file + `docs/INDEX.md` only. Then open just the module(s) the task needs. **Never read `dist/quiz.html` whole** (generated, 80 KB).

---------------------------------------------------------------------------------------------------

## 1. What it is, and who uses it

A single-page **MCQ mock-exam web app** for a small class (~10 students, can grow). The user is the **teacher** (a BUTEX final-year student who teaches/organises mock tests; also prepares Higher-Math admission MCQs: DU/JU/SUST).

| Role | Logs in with | Can do |
|---|---|---|
| **Student** | **ID + Password** (roster, checked on the server) | enter an exam code → timed quiz → result + review → own analytics → "retake mistakes" / retake |
| **Guest** | **only an exam code** (no account) | take that ONE exam; sees only its result. Can be switched off globally or per exam |
| **Teacher** | **Teacher ID (default `teacher`) + password** | Dashboard (analytics, CSV export), Exams (create/edit questions in the UI or upload CSV, open/close/delete), Students (roster, passwords, block, guest switch), Settings (theme, branding, texts, rules, password) |

Everything the teacher controls is edited **in the web UI** — no code edits needed for day-to-day changes. (That was the user's explicit request: "give control over every part of the app, theme → content → student IDs → features".)

### User conventions (important for any Claude working here)
- Talk to the user in **Bengali (often Banglish)**, technical terms in English. Keep answers **short**; user is often time-pressed and on phone/MacBook.
- When a manual step is needed from the user: **one step at a time**, wait for "done".
- User has **Claude Pro only — NO API key**. Never propose API/paid-server solutions. Claude artifacts cannot host this (CSP blocks fetch to other hosts).
- User wants Claude to **make the edits and deploy itself** when possible (see `docs/DEPLOY.md`). Passwords can't be typed by Claude — the user signs in to Google/GitHub in the built-in browser pane once.
- Use they/them for the user (pronouns unknown).

---------------------------------------------------------------------------------------------------

## 2. Live resources (as of 2026-11-16)

| Thing | Value |
|---|---|
| **Student URL** | https://moazbinabdullah2003-lgtm.github.io/mock-exam/quiz.html |
| GitHub repo | `moazbinabdullah2003-lgtm/mock-exam`, branch `main`, file `quiz.html` at repo root (GitHub Pages serves it). The GitHub repo only holds the built file, **not** this source tree. |
| Apps Script project | id `1y8kV5WPEO9-HJtnVhwdu0nnxV0a-xC6ug-J61AUgqMr7QJ6SOnFTdH-T` (title "Untitled project"). Active Web-app deployment "Untitled" (Execute as Me, Access: Anyone) — **Version 4** (2026-11-15 19:35). Archived: "Untitled", "mock test". |
| Web app `/exec` URL | in `src/js/01-config.js` → `CONFIG.SCRIPT_URL` (`https://script.google.com/macros/s/AKfycbx2xuErMRJf9XPij0Yt28hqLXf79oAN3MnQva2ERw4rTJLQsFrkmQwO6qpFxTCG3IRPjw/exec`). **Never create a "New deployment"** — it changes the URL. Always *Manage deployments → edit → New version*. |
| Spreadsheet "MCQ Mock Data" | id `1sU8tzNalkI30mmx8aAOQwz8lA_8jX4atM0m4fsnK3og` (also Script property `SSID`). Tabs: `Attempts`, `Questions`, `Settings`. |
| Teacher login | ID `teacher`, password `teacher123` (defaults; password can be changed in Settings→Security which stores Script property `TPASS`; ID is `access.teacherId` in settings) |
| Live `quiz.html` sha256 | starts `a511f2325f4d…` (full: `a511f2325f4dad21a25e00e815f96b2ffa229bb8524b992f43ca0e8755f17e10`) = current `dist/quiz.html` |

### Live data right now
- Exams: `DEMO1` (3 Q), **`MATH-B`** Beginner (17 Q, 20 min), **`MATH-I`** Intermediate (17 Q, 25 min), **`MATH-A`** Advanced (16 Q, 30 min); negative mark 0.25 on the three MATH exams. Source: `samples/math_3levels.csv` ← `samples/math_questions_with_solutions.md` (50 Higher-Math questions with step-by-step solutions, KaTeX).
- Roster: 2 students (`0001`, `0002`, passwords set). Attempts: 2 rows (DEMO1 tests).
- Settings saved by the teacher: theme preset `rose`; everything else default. (The saved settings still contain obsolete keys `access.mode/needPin` — harmless, ignored.)

---------------------------------------------------------------------------------------------------

## 3. Architecture

```
 Student/Teacher phone or laptop
        │  loads ONE static file
        ▼
 GitHub Pages  ── quiz.html (HTML+CSS+vanilla JS, no framework; KaTeX from cdnjs) ──┐
        │                                                                          │ fetch()
        │ GET (JSON, CORS-readable)       POST no-cors (fire & forget)             │
        ▼                                                                          │
 Google Apps Script Web App  (backend/Code.gs, runs as the teacher)  ◄─────────────┘
        │ reads/writes
        ▼
 Google Spreadsheet "MCQ Mock Data":  Attempts | Questions | Settings(KEY,VALUE: cfg, roster)
        + Script Properties: SSID, TPASS
```
- **No server cost, no API.** All logic is in the browser; the Apps Script is a thin storage + auth layer.
- Browser state lives in `localStorage` (`mq_*` keys); the page works offline for an already-cached exam and queues attempts (`mq_out`) to send later.
- POSTs use `mode:'no-cors'` → the page can't read the response → teacher writes are **verified by re-GETting** (`verifyExam`, `saveAll` poll).
- Apps Script answers slowly (≈1.5–2.5 s per call) — normal.

### Repo layout
```
quiz-server/
├─ src/template.html         HTML shell ({{CSS}} {{JS}} placeholders; loads KaTeX css/js from cdnjs)
├─ src/css/app.css           all styles; theme via CSS variables (--p --bg --card --t --rad …)
├─ src/js/NN-*.js            modules, concatenated in FILENAME order by build.py (all globals, no ES modules)
├─ build.py                  python3 build.py → dist/quiz.html
├─ dist/quiz.html            GENERATED. This is what gets uploaded to GitHub
├─ backend/Code.gs           Google Apps Script (pasted into the Apps Script editor)
├─ samples/                  questions_template.csv, math_3levels.csv, math_questions_with_solutions.md
├─ tools/                    md2csv.py (md→CSV), make_patch.py (deploy diff), browser_fake_backend.js (test harness)
├─ tests/                    run_tests.js + scenarios.js  (⚠ OUTDATED, needs node, see §10)
├─ docs/                     PROJECT_CONTEXT.md (this), INDEX.md (module map), ARCHITECTURE.md (protocol/data), DEPLOY.md (how to ship/test), BACKLOG.md
├─ NEW_CHAT_PROMPT.txt, README_BN.md
```
**Module load order matters** (concatenation order = filename order). `99-boot.js` MUST stay last — `boot()` calls `render()`, which touches variables declared in 13/14 with `let` (TDZ → blank page; this exact bug happened and was fixed).

Module map with line numbers/symbols: **`docs/INDEX.md`** (has a "Task → where to edit" table).

---------------------------------------------------------------------------------------------------

## 4. Backend (backend/Code.gs) — API

All via the one `/exec` URL.

| Method | Params | Auth | Result |
|---|---|---|---|
| GET | `action=exam&code=X` | none | `{title,minutes,neg,open,shuffle:true,questions:[{q,o[],a,t,e}]}` or `{error:'notfound'}` |
| GET | `action=settings` | none | `{ok:true,cfg:{…}}` — **public** settings JSON (theme/brand/texts/rules/access/exams) |
| GET | `action=login&sid&pin` | none | `{ok:true,name}` or `{ok:false,reason:'badlogin'|'blocked'}` — roster check; roster entry must exist, have a non-empty password, match, and not be blocked. (field is still called `pin`; UI says "Password") |
| GET | `action=tlogin&key=PASS` | — | `{ok:bool}` teacher password check |
| GET | `action=exams&key` | teacher | `[{code,title,minutes,neg,open,count}]` |
| GET | `action=roster&key` | teacher | roster array `[{id,pin,name,blocked}]` |
| GET | `sid=ID` | none | that student's attempts (own rows) |
| GET | `key=PASS` | teacher | all attempts |
| POST | `sid,name,exam,aid,mode,score,total,secs,details` | none | append to `Attempts` (dup `aid` ignored) |
| POST | `action=upload,key,code,rows(JSON, QHEAD order)` | teacher | replace all rows of CODE in `Questions` |
| POST | `action=delete\|setopen,key,code[,open]` | teacher | delete / open-close exam |
| POST | `action=savecfg,key,cfg(JSON string)` | teacher | store public settings (Settings sheet row `cfg`) |
| POST | `action=saveroster,key,roster(JSON string)` | teacher | store roster (row `roster`, never exposed publicly) |
| POST | `action=setpass,key,newpass` | teacher | Script property `TPASS` (min 4 chars) |

`pass_()` = `TPASS` property || `TEACHER_PASS` const (default `teacher123`). Wrong key on admin POST → silently `denied`.
Full details & sheet layouts: `docs/ARCHITECTURE.md`.

---------------------------------------------------------------------------------------------------

## 5. Settings engine (`src/js/02a-cfg.js`) — how "control everything" works

One JSON object **CFG** = `deepMerge(DEF_CFG, remote)`. Teacher edits a draft `CD` in Settings; `sp('a.b.c', value)` updates `CD`, re-merges `CFG` and calls `applyTheme()` (**live preview**); **Save all changes** (`saveAll()` in 13) POSTs `savecfg` (+ `saveroster` if the roster tab was loaded) and polls until the server returns the same JSON. Students call `loadCfg()` on every page load/refresh (cached in `localStorage.mq_cfg` so the theme appears instantly).

```
CFG = {
  theme:  {preset, primary, bg, card, text, ok, bad, radius, font, family}          // 8 presets in PRESETS
  brand:  {title, emoji, notice, noticeType:info|warn|good|bad, intro, footer}        // notice on login+home; intro = popup before every exam
  text:   {<key>:override}   // every UI label; defaults in TX, used via T('key')
  access: {guest:true, teacherId:'teacher'}
  rules:  {review:'full'|'marks'|'none', explain, showScore, passMark, retake, mistakes, maxAttempts,
           timer, confirm, analytics, history}
  exams:  { CODE:{maxAttempts, start, end, intro, guest:''|'yes'|'no'} }              // per-exam overrides
}
```
- **Add a new setting**: default in `DEF_CFG` → a field in `vSettings()` (13) using `fT/fA/fN/fC/fR/fS/fK` → use `CFG.x.y` where it matters. New UI label: add to `TX`, use `T('key')`. **No backend change needed.**
- **Shuffle is NOT a setting**: questions and options are *always* shuffled on every attempt (user requirement). See §7.
- `DIRTY` flag: while the teacher has unsaved edits, `setCfg()` ignores incoming remote settings.
- Per-exam overrides are applied in `applyOv()` / `canStart()` / `introOf()`.

---------------------------------------------------------------------------------------------------

## 6. Login model (src/js/06-views-login-home.js)

Three tabs on the login page (`LMODE`): **Student | Guest | Teacher** (Guest tab hidden if `access.guest` is false).
- **Student** `doLogin()`: `GET login&sid&pin` → `SESS={sid,name,teacher:false}`. Name comes from the roster (no name field). Roster empty ⇒ nobody can log in as student (guests still can). Password blank ⇒ that ID cannot log in.
- **Guest** `doGuest()`: exam code → `getExam` → checks open / `exams.CODE.guest!=='no'` / `canStart` → `SESS={sid:'G-XXXX' (per device, LS mq_gid), name:'Guest', guest:true, code}` → Guest home = one card for that exam + Start button (no code box, no analytics).
- **Teacher** `doTeacher()`: ID must equal `access.teacherId` (case-insensitive) AND password must pass `tlogin`. `SESS.key` = the typed password, used as `key=` on every admin call (`TKEY()`).
- Sessions persist in `localStorage.mq_sess` (auto-login on reload, also mid-exam resume via `mq_run`).
- Teacher ID is not secret; security rests on the password. Student passwords are stored in plain text in the sheet (teacher can read/generate them) — acceptable for a class; not for high stakes.

---------------------------------------------------------------------------------------------------

## 7. Exam flow & rules

1. `startCode()` (student) / `startGuest()` → `getExam` (fetch, applies per-exam overrides) → checks: open, `canStart()` (start/end window, max attempts counted from the student's `full` attempts) → optional **intro popup** (`introOf`) → `startRun()`.
2. `startRun()` — **always shuffles**: question order is Fisher–Yates shuffled and re-shuffled if identical to this student's previous attempt for the same exam (`mq_lo_<sid>_<exam>_<mode>`); option order is shuffled per question (`RUN.op[qi]` = permutation) **but options starting with "None of these / All of the above / Both… / উপরের সবগুলো / কোনোটিই নয়" are pinned last**. Answers are stored as ORIGINAL option indexes, so scoring/analytics ignore the permutation.
3. Quiz screen (`08-quiz.js`): palette, prev/next, clear, timer (optional), submit-confirm (optional). Timer auto-submits at 0. State in `RUN` (+`localStorage.mq_run`, survives refresh).
4. `finish()`: score = correct − wrong × NEG (skips free). Record `rec={aid,sid,name,exam,mode:'full'|'mistakes',score,total,secs,d:[[qIdx,chosen(-1 skipped),correct 0/1,secsOnQ]]}` → `mq_local` + `mq_out` → `flush()` POSTs it.
5. Result (`09-result.js`): honours `rules.review` (full = correct answer + explanation; marks = ✅/❌ only; none), `showScore`, `passMark`, `explain`. Teacher always sees full. Review shows options in ORIGINAL order (not the shuffled exam order — an open question for the user, see §12).
6. Analytics (`04-analytics.js`, `07-view-board.js`, `10-teacher-dashboard.js`): per-topic accuracy, weakest topics, heatmap, hardest questions, trend, history, CSV export.
- `qIdx` = row position of the question inside its CODE in `Questions` → **never reorder/insert rows of an exam that already has attempts** (the in-app editor re-uploads the whole exam; editing text is safe, reordering/deleting questions skews old analytics).

Math: questions/options/explanations may contain LaTeX in `$…$`; `mathify()` (02-helpers) renders with KaTeX after every `render()`; if CDN blocked it shows raw text.

---------------------------------------------------------------------------------------------------

## 8. Teacher panel (13-teacher-settings.js, 14-exam-editor.js, 10, 11)

Tabs: **📊 Dashboard · 📚 Exams · 👥 Students · ⚙ Settings**.
- **Exams**: list with ✏ Edit / Close-Open / Delete; "+ New exam (UI)"; CSV upload with preview (`parseQ`, format in `samples/questions_template.csv`). **Exam editor** (`openEditor/saveExam`): title/minutes/negative/open, per-exam rules (max attempts, start/end, intro, guest access), question cards (text, options with correct-radio, topic, explanation, live KaTeX preview, ↑↓⎘🗑, add question). Save re-uploads the exam and verifies it.
- **Students**: Guest on/off; roster rows (ID, Password, Name optional, Block); bulk add lines `ID, Password, Name`; "🎲 generate missing passwords"; import from past attempts. Red border = password missing.
- **Settings** sections: Theme & look · Branding/notice/instructions · Exam rules & features · All texts · Security (teacher ID, change password).
- A sticky **Save all changes** bar saves settings + roster together.

---------------------------------------------------------------------------------------------------

## 9. Network error handling (03-sync.js top)

`jget(url, ms=20000)` = fetch + timeout + JSON parse; throws `{kind:'timeout'|'offline'|'blocked'|'http'|'badresp', detail}`. `describeErr()` turns each kind into a Bengali message + a `[kind: detail]` tag; detects in-app browsers (Messenger/Facebook) via `INAPP`. `netFail(e, fnName)` shows the message and a **↻ Try again** button (`NETERR`). Login page has **🔧 Connection check** (`diag()`: online?, browser UA, can reach this site?, can reach Google server + ms). Typed login fields survive re-render (`KEEP` list in `render()`).
Used by: `doLogin`, `doGuest`, `doTeacher`, `getExam`/`startCode`. (Other fetches — `loadCfg`, `loadRemote`, `send` — still use plain `fetch` with silent catch.)

---------------------------------------------------------------------------------------------------

## 10. How to work (edit → build → test → deploy)

1. Edit `src/…` (never `dist/`). 2. `python3 build.py`. 3. Test (below). 4. Deploy (`docs/DEPLOY.md`: backend first if `Code.gs` changed, then `quiz.html`). 5. Update `docs/INDEX.md` / this file if structure or behaviour changed.

**Environment facts** (this Mac): `python3` yes; **`node` NOT installed** → `tests/run_tests.js` can't run and is **outdated** (its fake backend doesn't know login/settings/roster actions; teacher login scenario needs rewrite). Testing is done in the **built-in browser pane** with an in-page fake backend instead:
- Serve `dist/` locally: create `<primary working dir>/.claude/launch.json` with `python3 -m http.server 8765 --directory <abs path>/dist`, call `preview_start`, `navigate` to `http://localhost:8765/quiz.html`. (`file://` and `data:` tabs can't use localStorage / aren't scriptable after the first load.)
- Paste `tools/browser_fake_backend.js` via `javascript_tool` → full login/guest/exam/settings flows run without touching the real Sheet. Call app functions directly (`doLogin()`, `startRun()`, `finish()`, `saveAll()`…).
- **Never run write actions against the live backend for tests** unless cleaned up (teacher flows write to the real Sheet; student `finish()` creates real Attempts rows). Read-only GETs on the live backend are fine.
- Stop the preview server and delete the temporary `.claude/launch.json` afterwards.

**Deploying without the user**: see DEPLOY.md. Short version: user is signed in to Google + GitHub in the built-in browser pane; Code.gs goes through the Monaco editor with a sha256 check; `quiz.html` goes through the GitHub web editor using a small diff patch (`tools/make_patch.py`) with a sha256 check, then commit to `main`; verify by fetching the live file from the github.io origin and comparing the hash.

---------------------------------------------------------------------------------------------------

## 11. Pitfalls & lessons (things that already bit us)

- **Script order / TDZ**: boot must be last (`99-boot.js`). New modules with top-level `let/const` used during `render()` must load before boot.
- **`let` in the javascript_tool REPL**: variables declared with `let/const` in one call may not be visible as the same binding in later calls — use `window.x` for state shared across calls.
- GitHub pages (`github.com`) block `fetch` to localhost and to other origins (CSP) → can't pull files from a local server into the editor; use the patch/chunk method. Verify deployments by `fetch(location.pathname)` from a **github.io** tab, not from github.com.
- Browser pane tab ids change after navigation to local files; `tabs_context` first. A tab showing a local file may refuse page tools — use the localhost server instead.
- Apps Script "Manage deployments → Version" dropdown: clicking "New version" fails; focus the list and press `Up` then `Return` (sometimes twice; confirm "New version" shows in the field) before pressing Deploy.
- POST no-cors: never rely on response; poll with GET.
- UTF-16 offsets: patch offsets for the GitHub editor must be UTF-16 code units (JS strings); `make_patch.py` handles it. Bengali/emoji are common in the source.
- Roster field is named `pin` in storage/API for backward compatibility but is the **Password** everywhere in the UI.
- Option shuffle: stored answer indexes are ORIGINAL indexes — keep it that way, otherwise analytics and "retake mistakes" break.
- `esc()` converts `\n` → `<br>` (good for text) but is **not** attribute-safe for quotes in all cases → use `eA()` (13) or `data-*` for attribute values.
- Roster/cfg are stored as JSON strings in a sheet cell (≈50 k chars limit).
- Google may return an HTML error page (quota/maintenance) with HTTP 200 → shows as `badresp`.

---------------------------------------------------------------------------------------------------

## 12. Status, open items, backlog (2026-11-16)

**Working & deployed:** everything in §1–§9 (Backend v4, frontend hash `a511f2325f4d…`). Verified on the live site (read-only): login rejections, teacher login, guest home, Connection check; verified in-browser with a fake backend: all error kinds, shuffle (no repeated order over 30 attempts, pinned "None of these"), attempt limit, time window, intro popup, exam editor save, roster login (unknown/blocked/wrong/right), guest flow.

**Open / pending:**
1. **User reported "Network nei" when logging in on their device.** The server is healthy from our side. The new diagnostic UI was deployed to find the real cause; **waiting for the user to send the new message/`[kind: …]` tag or the Connection-check output**. Likely causes: ISP/WiFi blocking Google, Messenger/Facebook in-app browser, VPN/ad-blocker, stale cached old page (hard refresh).
2. Review screen shows options in original A-B-C-D order, not the order the student saw — user was asked whether they want the exam-time order; no answer yet.
3. Math question content decisions: Q21 (argument of −i) answer set to (c) −π/2 (principal value; (a),(d) are also valid arguments) — user may want to reword; Q49 assumes ω is the complex cube root (ω≠1); negative marking 0.25 assumed.
4. `tests/` suite is stale (see §10). Re-writing it for the browser-based harness (or installing node) is a worthwhile task.
5. Obsolete keys `access.mode`, `access.needPin` remain in the saved cfg (harmless).

**Backlog ideas (not decided — ask the user):** server-side grading so answers aren't in the page/network; hashed passwords + login rate-limit; exam window already exists per exam — add hide-results-until-released toggle; question images; PWA/offline; Bengali digits toggle; per-question time analytics UI (secs already stored); student self-registration; bulk delete attempts; cleaning legacy Google-Form/CSV path in `03-sync.js`; leaderboard.

---------------------------------------------------------------------------------------------------

## 13. Quick start for a new chat

1. Read this file, then `docs/INDEX.md`. 2. Ask what to change. 3. Open only the module(s) from INDEX's task table. 4. Edit `src/`, `python3 build.py`, test in the browser pane with `tools/browser_fake_backend.js`. 5. Deploy per `docs/DEPLOY.md` (ask the user to sign in to Google/GitHub in the pane if not already). 6. Reply in Bengali, short, and update the docs.
