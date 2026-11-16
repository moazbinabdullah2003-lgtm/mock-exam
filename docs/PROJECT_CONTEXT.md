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
| GitHub repo | `moazbinabdullah2003-lgtm/mock-exam`, branch `main` — now holds the **full project** (src, backend, docs, tests, tools). GitHub Actions (`.github/workflows/pages.yml`) runs the tests, builds `dist/quiz.html` and publishes it to Pages (Settings → Pages → Source = GitHub Actions). The repo is public: never commit secrets or backups. |
| Apps Script project | id `1y8kV5WPEO9-HJtnVhwdu0nnxV0a-xC6ug-J61AUgqMr7QJ6SOnFTdH-T` (title "Untitled project"). Active Web-app deployment "Untitled" (Execute as Me, Access: Anyone) — **Version 6** (2026-11-16, deployed with clasp; versions bump on every `./deploy-backend.sh`). Archived: "Untitled", "mock test". |
| Web app `/exec` URL | in `src/js/01-config.js` → `CONFIG.SCRIPT_URL` (`https://script.google.com/macros/s/AKfycbx2xuErMRJf9XPij0Yt28hqLXf79oAN3MnQva2ERw4rTJLQsFrkmQwO6qpFxTCG3IRPjw/exec`). **Never create a "New deployment"** — it changes the URL. Always *Manage deployments → edit → New version*. |
| Spreadsheet "MCQ Mock Data" | id `1sU8tzNalkI30mmx8aAOQwz8lA_8jX4atM0m4fsnK3og` (also Script property `SSID`). Tabs: `Attempts`, `Questions`, `Settings`. |
| Teacher login | ID `teacher`, password `teacher123` (defaults; password can be changed in Settings→Security which stores Script property `TPASS`; ID is `access.teacherId` in settings) |
| Live `quiz.html` sha256 | starts `23834f46aae9…` (2026-11-16 end of session: UI redesign, themes, copy-for-AI) = current `dist/quiz.html`. `tools/health.py` checks this automatically. |

### Live data right now
- Exams: `DEMO1` (3 Q), **`MATH-B`** Beginner (17 Q, 20 min), **`MATH-I`** Intermediate (17 Q, 25 min), **`MATH-A`** Advanced (16 Q, 30 min); negative mark 0.25 on the three MATH exams. Source: `samples/math_3levels.csv` ← `samples/math_questions_with_solutions.md` (50 Higher-Math questions with step-by-step solutions, KaTeX).
- Roster: 3 students — `0001` zaheen, `0002` rakin, and the **test student `9999` / `test1234`** (for Claude's post-update end-to-end checks; never delete real students). Attempts: 6 rows (as of backup `2026-11-16_143035`: 4 exams, 53 questions, 3 students, 6 attempts).
- Settings saved by the teacher: theme preset `rose`; brand = "Muaz's Classroom" 📚 + tagline (set by Claude on 2026-11-16); everything else default. The teacher may pick a new theme from the gallery any time. (The saved settings still contain obsolete keys `access.mode/needPin` — harmless, ignored.)

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
├─ tools/                    health.py (read-only live check), backup.py, restore.py, md2csv.py (md→CSV), symbols.py, browser_fake_backend.js (UI test harness)
├─ tests/                    backend.test.js + gas_harness.js (real Code.gs under node), run_tests.js + scenarios.js (frontend vs real backend)
├─ deploy.sh, deploy-backend.sh, backup.sh   one-command frontend deploy / backend deploy / full backup
├─ .github/workflows/pages.yml  CI: test + build + publish
├─ CLAUDE.md                 master instructions (workflow, backup rules, hard rules) — auto-read by Claude
├─ backups/  .local/         LOCAL ONLY (gitignored): data backups; teacher key for scripts
├─ docs/                     PROJECT_CONTEXT.md (this), INDEX.md (module map), ARCHITECTURE.md (protocol/data), DEPLOY.md (ship/test), BACKUP.md (backup/restore), TROUBLESHOOTING.md (symptom→fix), BACKLOG.md
├─ README_BN.md (user's Bengali guide), .clasp.json (Apps Script link)
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
| POST | `action=rename,key,code,newcode` | teacher | change exam code: rewrites CODE in `Questions` **and** EXAM in `Attempts` (history kept). Refuses (`exists`/`badcode`/`notfound`/`same`); newcode `[A-Z0-9_-]{1,30}` |
| POST | `action=savecfg,key,cfg(JSON string)` | teacher | store public settings (Settings sheet row `cfg`) |
| POST | `action=saveroster,key,roster(JSON string)` | teacher | store roster (row `roster`, never exposed publicly) |
| POST | `action=setpass,key,newpass` | teacher | Script property `TPASS` (min 4 chars) |

`pass_()` = `TPASS` property || `TEACHER_PASS` const (default `teacher123`). Wrong key on admin POST → silently `denied`.
Full details & sheet layouts: `docs/ARCHITECTURE.md`.

---------------------------------------------------------------------------------------------------

## 4b. UI design (2026-11-16 redesign)

Brand **Muaz's Classroom** (📚, tagline) — stored in live cfg `brand.title/emoji/tagline` (DEF_CFG has the same defaults). Principle: **few big things up front, details in collapsible folds**. Login = hero (logo, name, tagline) + 3 choice cards. Student home = hello + big exam-code box + 3 tiles (attempts/avg/best) + folds (focus topics, trend, retake, history). Result = big score + tiles + folds (topic-wise, review). Teacher dashboard = filter + 4 tiles + "⚠ মনোযোগ দরকার" (students <60%) + folds. Profile = 4 tiles + summary + folds. Fold helper: `sec(id,title,body,sub)` in `13` (state in `SO`, survives re-render). Tiles: `tile(v,label,color)` in `07`. Page-enter animation: `#app.enter` + `html.anim` (theme.anim). CSS classes: `.hero .choices .choice .tiles .tile .btn.lg .bigin` (don't use `.big` on buttons — it's the score style).

## 5. Settings engine (`src/js/02a-cfg.js`) — how "control everything" works

One JSON object **CFG** = `deepMerge(DEF_CFG, remote)`. Teacher edits a draft `CD` in Settings; `sp('a.b.c', value)` updates `CD`, re-merges `CFG` and calls `applyTheme()` (**live preview**); **Save all changes** (`saveAll()` in 13) POSTs `savecfg` (+ `saveroster` if the roster tab was loaded) and polls until the server returns the same JSON. Students call `loadCfg()` on every page load/refresh (cached in `localStorage.mq_cfg` so the theme appears instantly).

```
CFG = {
  theme:  {preset, primary, bg, card, text, ok, bad, radius, font, family,
           bgStyle:plain|gradient|dots, shadow:none|soft|strong, density:compact|normal|roomy, width:narrow|normal|wide,
           btnShape:rounded|pill|square, hero:22-48 (login title px), align:center|left, anim:bool}   // 18 presets in PRESETS (10 full "looks" with style keys: classic, mint, lavender, coral, sky, notebook, minimal, emerald, night, grape + 8 old colour-only); each has n (name) + d (desc) shown in the Settings theme gallery (.thg/.thm), applyPreset strips n/d; applyTheme sets CSS vars --pad --w --btnr --hero --sh
  brand:  {title, tagline, emoji, notice, noticeType:info|warn|good|bad, intro, footer}        // notice on login+home; intro = popup before every exam
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

Login page first shows a **choose screen** with 3 big buttons: **Student | Guest | Teacher** (Guest hidden if `access.guest` is false); `LMODE=''` = choose screen, picking one shows its form + a "← Back" link (`setLM('')`).
- **Student** `doLogin()`: `GET login&sid&pin` → `SESS={sid,name,teacher:false}`. Name comes from the roster (no name field). Roster empty ⇒ nobody can log in as student (guests still can). Password blank ⇒ that ID cannot log in.
- **Guest** `doGuest()`: **name (required) + exam code** (no ID/password) → `getExam` → checks open / `exams.CODE.guest!=='no'` / `canStart` → `SESS={sid:'G-XXXX' (per device, LS mq_gid), name:'<typed name> (Guest)', guest:true, code}` → Guest home = one card for that exam + Start button (no code box, no analytics).
- **Teacher** `doTeacher()`: ID must equal `access.teacherId` (case-insensitive) AND password must pass `tlogin`. `SESS.key` = the typed password, used as `key=` on every admin call (`TKEY()`).
- Sessions persist in `localStorage.mq_sess` (auto-login on reload, also mid-exam resume via `mq_run`).
- Teacher ID is not secret; security rests on the password. Student passwords are stored in plain text in the sheet (teacher can read/generate them) — acceptable for a class; not for high stakes.

---------------------------------------------------------------------------------------------------

## 7. Exam flow & rules

1. `startCode()` (student) / `startGuest()` → `getExam` (fetch, applies per-exam overrides) → checks: open, `canStart()` (start/end window, max attempts counted from the student's `full` attempts) → optional **intro popup** (`introOf`) → `startRun()`.
2. `startRun()` — **always shuffles**: question order is Fisher–Yates shuffled and re-shuffled if identical to this student's previous attempt for the same exam (`mq_lo_<sid>_<exam>_<mode>`); option order is shuffled per question (`RUN.op[qi]` = permutation) **but options starting with "None of these / All of the above / Both… / উপরের সবগুলো / কোনোটিই নয়" are pinned last**. Answers are stored as ORIGINAL option indexes, so scoring/analytics ignore the permutation.
3. Quiz screen (`08-quiz.js`): palette, prev/next, clear, timer (optional), submit-confirm (optional). **Keyboard** (`onQuizKey`): `1..N` = option by DISPLAYED position (options show numbers 1–N, not letters), `Enter` = save & next (on the last question opens the submit-confirm modal even if `rules.confirm` is off; in the modal Enter submits, Esc cancels), `← →` = prev/next; ignored while typing in an input. **Per-question time**: `addTime()` adds the time spent on the current question on every `go()`/`finish()` into `RUN.secs[p]` (counted in the background, no UI); saved as `d[k][3]` (seconds). Timer auto-submits at 0. State in `RUN` (+`localStorage.mq_run`, survives refresh).
4. `finish()`: score = correct − wrong × NEG (skips free). Record `rec={aid,sid,name,exam,mode:'full'|'mistakes',score,total,secs,d:[[qIdx,chosen(-1 skipped),correct 0/1,secsOnQ]]}` → `mq_local` + `mq_out` → `flush()` POSTs it.
5. Result (`09-result.js`): honours `rules.review` (full = correct answer + explanation; marks = ✅/❌ only; none), `showScore`, `passMark`, `explain`. Teacher always sees full. Review shows options in ORIGINAL order (not the shuffled exam order — an open question for the user, see §12).
5b. **📋 Copy for AI** (`09a`): result page has an "🤖 AI দিয়ে বুঝে নাও" card (full exam copy) + 📋 per question in Review; teacher exam page has full-exam copy + 📋 per question in Question-wise. Text = Markdown, math kept as LaTeX `$…$`, options A/B/…, my answer, correct answer, teacher's solution, plus a prompt for the AI. Students: `review=full` → answers+solution (solution only if `rules.explain`), `marks` → only ✅/❌, `none` → no copy.
6. **Time analytics** fold on every analytics page (`07b`, `vTimeBlock`): avg time/question, total, slowest topic; topic-wise time; question-wise time per exam sorted slowest first (tags: বেশি সময়, কঠিন/lengthy); student-wise time table (teacher pages); profile compares with class.
   Analytics (`04-analytics.js` incl. `qTimeStats`: avg/max seconds + accuracy per question; teacher Dashboard card **⏱ কোন question-এ বেশি সময় যাচ্ছে** = `vTimeCard`; profile slow-questions show class avg; `07-view-board.js`, `10-teacher-dashboard.js`): per-topic accuracy, weakest topics, heatmap, hardest questions, trend, history, CSV export.
- `qIdx` = row position of the question inside its CODE in `Questions` → **never reorder/insert rows of an exam that already has attempts** (the in-app editor re-uploads the whole exam; editing text is safe, reordering/deleting questions skews old analytics).

Math: questions/options/explanations may contain LaTeX in `$…$`; `mathify()` (02-helpers) renders with KaTeX after every `render()`; if CDN blocked it shows raw text.

---------------------------------------------------------------------------------------------------

## 8. Teacher panel (13-teacher-settings.js, 14-exam-editor.js, 10, 11)

Tabs: **📊 Dashboard · 📚 Exams · 👥 Students · ⚙ Settings**.
- **Exam analytics**: tap an exam (or 📊) in Exams → `vExamAnalytics` (`10a`): general (students, attempts, avg/high/low, pass rate or avg time; score distribution, topic-wise, question-wise, student×question grid) + student-wise ranking. "Retake mistakes" attempts are excluded.
- **Exams**: list with ✏ Edit / Close-Open / Delete; "+ New exam (UI)"; CSV upload with preview (`parseQ`, format in `samples/questions_template.csv`). **Exam editor** (`openEditor/saveExam`): **Exam code (editable → `saveExam` calls backend `rename`, moves per-exam rules in cfg, checks the new code is free)**, title/minutes/negative/open, per-exam rules (max attempts, start/end, intro, guest access), question cards (text, options with correct-radio, topic, explanation, live KaTeX preview, ↑↓⎘🗑, add question). Save re-uploads the exam and verifies it.
- **🎓 Test student button** (teacher header, all tabs): `asTestStudent()` (06) reads the roster with the teacher key, finds ID `9999`, does a REAL student login with its stored password (nothing typed, no password in code) → `SESS={…,back:<teacher session>}`; student home then shows **← Teacher-এ ফিরো** (`backToTeacher()`). Needs `9999` in the roster with a password (already there).
- **Student profile** (tap a row in Dashboard, or 👤 Profile in Students tab): summary sentences, avg/best/lowest/latest/trend/pass count/active days/total time, answer split ✔✘⏭, score-trend chart, exam-wise table, topic-wise (Weak/Improve/Strong vs class avg), still-wrong questions, slowest questions, full activity log with Review. Code: `07a-view-profile.js`. Dashboard table also has a Trend column.
- **Students**: Guest on/off; roster rows (ID, Password, Name optional, Block); bulk add lines `ID, Password, Name`; "🎲 generate missing passwords"; import from past attempts. Red border = password missing.
- **Settings** sections: Theme & look · Branding/notice/instructions · Exam rules & features · All texts · Security (teacher ID, change password).
- A sticky **Save all changes** bar saves settings + roster together.

---------------------------------------------------------------------------------------------------

## 9. Network error handling (03-sync.js top)

`jget(url, ms=20000)` = fetch + timeout + JSON parse; throws `{kind:'timeout'|'offline'|'blocked'|'http'|'badresp', detail}`. `describeErr()` turns each kind into a Bengali message + a `[kind: detail]` tag; detects in-app browsers (Messenger/Facebook) via `INAPP`. `netFail(e, fnName)` shows the message and a **↻ Try again** button (`NETERR`). Login page has **🔧 Connection check** (`diag()`: online?, browser UA, can reach this site?, can reach Google server + ms). Typed login fields survive re-render (`KEEP` list in `render()`).
Used by: `doLogin`, `doGuest`, `doTeacher`, `getExam`/`startCode`. (Other fetches — `loadCfg`, `loadRemote`, `send` — still use plain `fetch` with silent catch.)

---------------------------------------------------------------------------------------------------

## 10. How to work (edit → build → test → deploy → verify → docs)

Authoritative short version: **`CLAUDE.md`**. Details: `docs/DEPLOY.md`.
1. Edit `src/` / `backend/Code.gs` (never `dist/`). 2. `python3 build.py` + `node tests/backend.test.js && node tests/run_tests.js` (PATH needs `/opt/homebrew/bin`). 3. `./deploy-backend.sh "msg"` (if Code.gs changed) then `./deploy.sh "msg"`; both run tests first. 4. Verify live hash + test-student end-to-end. 5. Update docs. 6. After the batch: ask the user, then `./backup.sh` (`docs/BACKUP.md`).

UI/visual checks still use the built-in browser pane + `tools/browser_fake_backend.js` (DEPLOY.md §C). **Never run write actions against the live backend for tests** except as the test student `9999` (its attempts appear in the teacher dashboard). Read-only GETs on the live backend are fine. Stop preview servers and delete any temporary `.claude/launch.json` afterwards.

---------------------------------------------------------------------------------------------------

## 11. Pitfalls & lessons (things that already bit us)

- **Script order / TDZ**: boot must be last (`99-boot.js`). New modules with top-level `let/const` used during `render()` must load before boot.
- POST no-cors: never rely on response; poll with GET.
- Roster field is named `pin` in storage/API for backward compatibility but is the **Password** everywhere in the UI.
- Option shuffle: stored answer indexes are ORIGINAL indexes — keep it that way, otherwise analytics and "retake mistakes" break.
- `esc()` converts `\n` → `<br>` (good for text) but is **not** attribute-safe for quotes in all cases → use `eA()` (13) or `data-*` for attribute values.
- Roster/cfg are stored as JSON strings in a sheet cell (≈50 k chars limit).
- Google may return an HTML error page (quota/maintenance) with HTTP 200 → shows as `badresp`.

---------------------------------------------------------------------------------------------------
- Student IDs are numbers only (user confirmed). Some letter IDs got a Google error page from the live backend (cause unknown) — keep IDs numeric.
- Never use Apps Script "New deployment" (changes the /exec URL). `deploy-backend.sh` moves the existing deployment to a new version.
- Symptom→fix table: `docs/TROUBLESHOOTING.md`.

---------------------------------------------------------------------------------------------------

---------------------------------------------------------------------------------------------------

## 12. Status, open items, backlog (2026-11-16)

**Working & deployed (2026-11-16, backend Version 6):** everything in §1–§9 plus this session's work:
- Login choose screen (Student / Guest / Teacher); guest = name + exam code.
- Teacher-side: full **student profile** (`07a`), **🎓 Test student** one-click switch (`asTestStudent`), **exam code rename** (backend `rename`, history kept), **per-exam analytics** (`10a`), **⏱ time analytics** everywhere (`07b`), **📋 Copy for AI** (`09a`).
- Quiz: keyboard shortcuts (1–N, Enter, ← →), options numbered 1–N; per-question time saved.
- UI redesign (§4b): brand Muaz's Classroom, hero login, big tiles, collapsible folds, animation, layout/style controls, **18 theme presets with a preview gallery**.
- **🔬 Science themes (2026-11-16):** 9 new full-look presets (Chalkboard, Blueprint, Lab Notebook, Periodic Table, Quantum Dark, DNA Bio, Circuit Board, Graph Paper, Science Mix) with background symbol patterns drawn as SVG in code (`02b-motif.js`, no images). Settings → Theme: gallery split into Science / Color; controls for symbol type, color (main/text), intensity, size, show during exam (default off), big login-title symbol. Old full-look presets set `motif:'none'`; colour-only presets keep the current motif.
- Verified: tests 58 backend + 61 frontend; `tools/health.py` ALL GOOD; each feature looked at in the browser pane with the fake backend. NOT yet done by Claude on the live site: a full test-student exam end-to-end after the redesign (do it at the start of the next session if asked).

**Open / pending:**
1. **User reported "Network nei" when logging in on their device.** The server is healthy from our side. The new diagnostic UI was deployed to find the real cause; **waiting for the user to send the new message/`[kind: …]` tag or the Connection-check output**. Likely causes: ISP/WiFi blocking Google, Messenger/Facebook in-app browser, VPN/ad-blocker, stale cached old page (hard refresh).
2. Review screen shows options in original A-B-C-D order, not the order the student saw — user was asked whether they want the exam-time order; no answer yet.
3. Math question content decisions: Q21 (argument of −i) answer set to (c) −π/2 (principal value; (a),(d) are also valid arguments) — user may want to reword; Q49 assumes ω is the complex cube root (ω≠1); negative marking 0.25 assumed.
4. Theme: live is still `rose`; user said they will choose from the new gallery themselves.
6. Animation note: in the hidden/background browser pane, screenshots can catch the page mid fade-in (looks blank) — wait and screenshot again; real browsers are fine.
5. Obsolete keys `access.mode`, `access.needPin` remain in the saved cfg (harmless).

**Backlog ideas (not decided — ask the user):** server-side grading so answers aren't in the page/network; hashed passwords + login rate-limit; exam window already exists per exam — add hide-results-until-released toggle; question images; PWA/offline; Bengali digits toggle; student self-registration; bulk delete attempts; cleaning legacy Google-Form/CSV path in `03-sync.js`; leaderboard.

---------------------------------------------------------------------------------------------------

## 13. Quick start for a new chat

1. Read `CLAUDE.md`, this file, then `docs/INDEX.md`. 2. Ask what to change. 3. Open only the modules from INDEX's task table. 4. Follow §10 (edit → test → deploy → verify → docs). 5. Bengali, short. 6. After the batch is done, ask once about `./backup.sh`. 7. On "pack koro": `docs/PACKUP.md`.
