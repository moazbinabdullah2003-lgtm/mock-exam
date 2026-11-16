# DEPLOY & TEST — exactly how to ship changes (proven recipes)

Order: **backend first** (`backend/Code.gs`, only if it changed), then **frontend** (`dist/quiz.html`). The frontend is written to degrade gracefully with an older backend, but new features need the new backend.

Prerequisite: the user is signed in to **Google** (script.google.com / docs.google.com) and **GitHub** in the built-in browser pane (Claude cannot type passwords). First visit to a site may ask the user to allow it. Check with `tabs_context`; open the Apps Script / GitHub URL; if a login page appears, ask the user to sign in in the pane and say "done".

Constants:
- Apps Script editor: `https://script.google.com/home/projects/1y8kV5WPEO9-HJtnVhwdu0nnxV0a-xC6ug-J61AUgqMr7QJ6SOnFTdH-T/edit`
- GitHub editor: `https://github.com/moazbinabdullah2003-lgtm/mock-exam/edit/main/quiz.html`
- Live page: `https://moazbinabdullah2003-lgtm.github.io/mock-exam/quiz.html`
- Spreadsheet: `https://docs.google.com/spreadsheets/d/1sU8tzNalkI30mmx8aAOQwz8lA_8jX4atM0m4fsnK3og`

---------------------------------------------------------------------------------------------------

## A. Backend deploy (Code.gs → Apps Script)

1. `shasum -a 256 backend/Code.gs` → note the hash. (`Code.gs` has no backticks and no `${`, so it can be put in a JS template literal `String.raw\`…\``.)
2. Navigate a tab to the Apps Script editor URL. Wait ~2.5 s for Monaco.
3. In `javascript_tool` (on script.google.com): put the new source in `const SRC = String.raw\`…\``, compute sha256 of `SRC` in the page and compare with step 1 (abort if different). For a big change send gzip+base64 instead (`gzip -9 -c Code.gs | base64 | tr -d '\n'` → `DecompressionStream('gzip')`). For a small change only replace the tail/function: `cur.slice(0, cur.indexOf('<marker>')) + NEWTAIL` and still verify the hash.
4. Apply: `const ed=monaco.editor.getEditors()[0], model=ed.getModel(); ed.executeEdits('x',[{range:model.getFullModelRange(), text:SRC}]); ed.focus();` then `computer key cmd+s` and confirm "Saved to Drive".
5. Deploy → **Manage deployments** (NOT "New deployment" — that changes the /exec URL):
   `find "Deploy"` → click → click "Manage deployments" (≈(504,156) at 800 px width) → wait for list → click ✏ pencil (≈(692,130)) → click the Version dropdown (≈(500,208)) → press keys `Up Return` (the dropdown may need it twice; take a screenshot and confirm the field says **New version**) → click **Deploy** (≈(730,722)) → wait ~5 s → "Deployment successfully updated. Version N" → click Done (≈(710,722)).
   Always take screenshots (scale 0.5) between steps; coordinates shift with window size.
6. Verify with GETs from a github.io tab (read-only): `settings`, `tlogin&key=…`, `login&sid=1&pin=1` … compare with expectations (see docs/ARCHITECTURE.md).

Manual alternative for the user: script.google.com → project → paste code → Save → Deploy → Manage deployments → ✏ → Version: New version → Deploy.

---------------------------------------------------------------------------------------------------

## B. Frontend deploy (src/ → GitHub Pages) — AUTOMATIC since 2026-11-16

Local folder is a git repo (remote `origin` = github.com/moazbinabdullah2003-lgtm/mock-exam, branch `main`). Push credential (fine-grained token) is stored in the macOS Keychain, so `git push` works from Claude's Bash.

1. Edit `src/`, then run `./deploy.sh "what changed"` (does `python3 build.py`, commit, push).
2. GitHub Actions (`.github/workflows/pages.yml`) rebuilds `dist/quiz.html` and publishes it to Pages (Settings → Pages → Source = GitHub Actions). Live in ~30-60 s at the same URL.
3. Verify: poll the live URL with `?x=$RANDOM` and compare `shasum -a 256` with `dist/quiz.html`.

The old browser-editor patch method is obsolete. If the token expires, user creates a new fine-grained token (Contents + Workflows: read/write on mock-exam) and runs `git push` once in Terminal.

---------------------------------------------------------------------------------------------------

## C. Testing (no node on this Mac)

`tests/run_tests.js` needs node and is **stale** (its fake backend predates login/settings/roster). Use the browser pane:

1. Build, then create `<primary working dir>/.claude/launch.json`:
   ```json
   { "version":"0.0.1","configurations":[{"name":"quiz-dist","runtimeExecutable":"python3",
     "runtimeArgs":["-m","http.server","8765","--directory","/Users/mac/claude code/quiz-server/dist"],"port":8765}] }
   ```
   `preview_start name=quiz-dist` → it opens a tab; `navigate http://localhost:8765/quiz.html` (localStorage works on localhost; `file://` does not).
2. `javascript_tool`: paste `tools/browser_fake_backend.js` (in-memory copy of Code.gs), then drive the app: `doLogin()`, `doGuest()`, `doTeacher()`, `startRun('DEMO1','full')`, `finish(false)`, `gotoTab('set')`, `sp('theme.primary','#000')`, `saveAll()`, `openEditor('DEMO1')`, `diag()` …. Check `view`, `msg`, `DB.*`, DOM counts, and take screenshots (`scale 0.5`).
3. Error simulation: wrap `window.fetch` to throw `TypeError('Failed to fetch')`, return HTTP 503, return HTML text, or hang until `AbortError`; flip with `window.__mode` (not `let`).
4. `preview_stop` and delete the temporary `.claude/launch.json` when finished. Never leave test rows in the real sheet.

Live read-only smoke test (safe): from a github.io tab, `fetch(CONFIG.SCRIPT_URL+'?action=settings')`, `…action=tlogin&key=teacher123`, `…action=login&sid=1&pin=1` (expect `badlogin`), `…action=exams&key=teacher123`.

---------------------------------------------------------------------------------------------------

## D. Common operations (no code deploy needed)

- Change theme/texts/rules/branding/notice/password, manage students, create or edit exams → teacher panel in the web app (see PROJECT_CONTEXT §8). Instant for all students after **Save all changes**.
- Put the 50 Higher-Math questions (or any markdown in the same format) into exams: `python3 tools/md2csv.py <md> samples/out.csv` (levels 🟢🟡🔴 → exams `MATH-B/I/A`; edit the topic map/minutes inside the script), then in the app: Exams → upload CSV → Preview → Publish. CSV format: `samples/questions_template.csv`.
- Reset a forgotten teacher password: Apps Script editor → Project Settings → Script properties → delete `TPASS` (falls back to `TEACHER_PASS` in Code.gs, default `teacher123`).
- Look at / edit raw data: the spreadsheet (tabs Attempts, Questions, Settings). Don't edit `Settings` by hand unless you know the JSON.
