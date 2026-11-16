# CLAUDE.md — Quiz Server (MCQ Mock Exam). Read this first, every session.

The user **cannot read or write code**; they work only through Claude. So: keep this folder the single, complete, well-indexed source of truth, and do the work + deploy + backup yourself.

## Reading order (token-cheap)
1. `docs/PROJECT_CONTEXT.md` (architecture, live IDs, status, pitfalls) → 2. `docs/INDEX.md` (module map + "Task → where to edit") → open only the modules the task needs. Never open `dist/quiz.html` whole. Protocol/data model: `docs/ARCHITECTURE.md`. Ops: `docs/DEPLOY.md`, `docs/BACKUP.md`. **Something broken? `python3 tools/health.py` then `docs/TROUBLESHOOTING.md`.**

## How to talk to the user
Bengali/Banglish, technical terms in English, **short**. Manual steps for the user: one step at a time, wait for "done". User has Claude Pro only — **no API/paid server**. Use they/them. Never type passwords; never put credentials in chat or in the public GitHub repo.

## Environment (this Mac)
`python3`, `git`, `node` + `clasp` (Homebrew: use `export PATH=/opt/homebrew/bin:$PATH` in Claude's shell). GitHub push token is in the macOS Keychain. clasp is logged in.

## The workflow (edit → test → deploy → verify → docs)
1. Edit `src/` (frontend) and/or `backend/Code.gs`. Never edit `dist/` or `quiz.html` by hand.
2. `python3 build.py`; `node tests/backend.test.js && node tests/run_tests.js` (add scenarios for new behaviour). UI/visual checks: browser pane per `docs/DEPLOY.md` §C.
3. Deploy: backend `./deploy-backend.sh "msg"` (only if Code.gs changed, do it first); frontend `./deploy.sh "msg"`. Both run the tests first and stop on failure. /exec URL never changes. **Never use "New deployment".**
4. Verify: `python3 tools/health.py` (live hash == dist, backend, teacher key, test student login, backup age); then an end-to-end check as the **test student** (ID `9999`, password `test1234`: login → take exam → result saved). Its attempts show in the teacher dashboard as "Test Student".
5. Update docs (`INDEX.md` if structure changed, `PROJECT_CONTEXT.md` §12 status, `DEPLOY.md`/`BACKUP.md` if the process changed). Keep this folder current — it must always describe the real system.

## Backups (see `docs/BACKUP.md`) — do NOT run one after every small edit (wastes tokens)
- Work through the whole batch of requested changes first. When the batch is done, **ask the user once** ("backup নেব?") and only on yes run `./backup.sh`. Exception: before any risky/destructive step (restore, bulk delete, schema change, roster/exam overwrite) ask to back up first.
- A backup is a script run (cheap): data (settings, roster, exams, attempts) + project tarball + manifest in `backups/<time>/`. It stays on the Mac and is gitignored (it contains student passwords). Report the counts from its last line. Restore: `python3 tools/restore.py backups/<stamp>` (dry run) then `--yes`, only after the user agrees.
- Suggest a backup if the newest one in `backups/` is older than ~7 days or before a big change.

## Hard rules
- Student IDs are numbers only. `saveroster` replaces the WHOLE roster: always read the current roster first and append; real students (0001 zaheen, 0002 rakin) must never be lost.
- Saved answer indexes are ORIGINAL option indexes (options are shuffled only for display).
- `src/js/99-boot.js` must stay the last module. Do not push `backups/` or `.local/` (gitignored). Never commit secrets.
- Frontend tests use `TT.ok/TT.eq` (the app owns `T()` for UI texts).
