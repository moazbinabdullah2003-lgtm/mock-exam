# DEPLOY & TEST — exactly how to ship changes (proven recipes)

Backups: see `docs/BACKUP.md` (take one after a batch of work, with the user's OK).

Order: **backend first** (`backend/Code.gs`, only if it changed), then **frontend** (`dist/quiz.html`). The frontend is written to degrade gracefully with an older backend, but new features need the new backend.

Prerequisites (one-time, already done): GitHub push token in the macOS Keychain; `clasp` logged in; Apps Script API switched on. If either expires see `docs/TROUBLESHOOTING.md`. Claude never types passwords.

Constants:
- Apps Script editor: `https://script.google.com/home/projects/1y8kV5WPEO9-HJtnVhwdu0nnxV0a-xC6ug-J61AUgqMr7QJ6SOnFTdH-T/edit`
- GitHub Actions runs: `https://github.com/moazbinabdullah2003-lgtm/mock-exam/actions`
- Live page: `https://moazbinabdullah2003-lgtm.github.io/mock-exam/quiz.html`
- Spreadsheet: `https://docs.google.com/spreadsheets/d/1sU8tzNalkI30mmx8aAOQwz8lA_8jX4atM0m4fsnK3og`

---------------------------------------------------------------------------------------------------

## A. Backend deploy (Code.gs → Apps Script) — AUTOMATIC since 2026-11-16

Node + clasp are installed (`brew install node`, `npm i -g @google/clasp`; clasp is logged in as the user's Google account; `.clasp.json` has scriptId and rootDir=backend). Run:

`./deploy-backend.sh "what changed"` — pushes `backend/Code.gs` and moves the existing /exec deployment (id inside the script) to a new version, so the URL never changes. Verify with a read-only GET `...exec?action=settings`.

If clasp says not logged in: user runs `clasp login` once in Terminal (needs Apps Script API on at script.google.com/home/usersettings). The old browser-editor recipe is obsolete. Prefix `export PATH=/opt/homebrew/bin:$PATH` if `node`/`clasp` are not found in Claude's shell.

---------------------------------------------------------------------------------------------------

## B. Frontend deploy (src/ → GitHub Pages) — AUTOMATIC since 2026-11-16

Local folder is a git repo (remote `origin` = github.com/moazbinabdullah2003-lgtm/mock-exam, branch `main`). Push credential (fine-grained token) is stored in the macOS Keychain, so `git push` works from Claude's Bash.

1. Edit `src/`, then run `./deploy.sh "what changed"` (does `python3 build.py`, commit, push).
2. GitHub Actions (`.github/workflows/pages.yml`) rebuilds `dist/quiz.html` and publishes it to Pages (Settings → Pages → Source = GitHub Actions). Live in ~30-60 s at the same URL.
3. Verify: poll the live URL with `?x=$RANDOM` and compare `shasum -a 256` with `dist/quiz.html`.

The old browser-editor patch method is obsolete. If the token expires, user creates a new fine-grained token (Contents + Workflows: read/write on mock-exam) and runs `git push` once in Terminal.

---------------------------------------------------------------------------------------------------

## C. Testing — AUTOMATIC (node installed 2026-11-16)

- `node tests/backend.test.js` runs the REAL `backend/Code.gs` under node with in-memory fakes of SpreadsheetApp/PropertiesService/LockService/ContentService (`tests/gas_harness.js`).
- `node tests/run_tests.js` loads `dist/quiz.html` logic (build first) and talks to that real backend: teacher login/publish/close/delete, student login (wrong/blocked/ok), exam by code, scoring, save, read-back, mistakes retake, guest.
- `deploy.sh` and `deploy-backend.sh` run them first and stop on any failure; GitHub Actions runs them too before publishing.
- Add scenarios at the bottom of `tests/scenarios.js` (inside the app scope; the app already has `T()` for texts, so assertions are `TT.ok/TT.eq`). Add backend cases to `tests/backend.test.js`.
- Visual/UI checks still use the browser pane: build, `preview_start` a python http.server on `dist/`, paste `tools/browser_fake_backend.js`, take screenshots. Never leave test rows in the real sheet.

---------------------------------------------------------------------------------------------------

## D. Common operations (no code deploy needed)

- Change theme/texts/rules/branding/notice/password, manage students, create or edit exams → teacher panel in the web app (see PROJECT_CONTEXT §8). Instant for all students after **Save all changes**.
- Put the 50 Higher-Math questions (or any markdown in the same format) into exams: `python3 tools/md2csv.py <md> samples/out.csv` (levels 🟢🟡🔴 → exams `MATH-B/I/A`; edit the topic map/minutes inside the script), then in the app: Exams → upload CSV → Preview → Publish. CSV format: `samples/questions_template.csv`.
- Reset a forgotten teacher password: Apps Script editor → Project Settings → Script properties → delete `TPASS` (falls back to `TEACHER_PASS` in Code.gs, default `teacher123`).
- Look at / edit raw data: the spreadsheet (tabs Attempts, Questions, Settings). Don't edit `Settings` by hand unless you know the JSON.
