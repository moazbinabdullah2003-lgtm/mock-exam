# PACKUP — end-of-session checklist (for a clean fresh start next chat)

Run this whenever the user says **"pack koro" / "session pack" / "packup" / "fresh start-er jonno ready koro"**.
Do EVERY step, in order. Do not skip one because it "looks done" — check it. Report each step's result to the user in one line.

## 1. Nothing half-done
- [ ] Every change the user asked for this session is finished, or clearly listed as NOT done in step 4.
- [ ] No temporary files left: `rm -f dist/_fake.js .claude/launch.json` (and `rmdir .claude` if empty). Stop any preview server (`preview_list` → `preview_stop`). Reset any emulated browser viewport.
- [ ] `git status --short` → only intended changes (no stray test/debug files).

## 2. Build + test + deploy state
- [ ] `export PATH=/opt/homebrew/bin:$PATH; python3 build.py` (dist must match src).
- [ ] `node tests/backend.test.js && node tests/run_tests.js` → all pass. Note the counts.
- [ ] If `backend/Code.gs` changed and isn't deployed: `./deploy-backend.sh "msg"` first.
- [ ] If frontend changed and isn't live: `./deploy.sh "msg"`, wait ~80 s.
- [ ] `python3 tools/health.py` → **ALL GOOD** (live hash == dist, backend, teacher key, test student, backup age). If anything FAILS → fix or report; do not pack over a failure silently.

## 3. Backup (user asked for pack = permission to back up)
- [ ] `./backup.sh` → note the folder `backups/<stamp>` and the counts line (exams, questions, students, attempts).
- [ ] Real students must be in it: `0001` zaheen, `0002` rakin (+ test `9999`).

## 4. Docs = the real system (the next chat only knows what is written)
- [ ] `docs/PROJECT_CONTEXT.md`:
  - §2 live resources: backend **Version N**, live `quiz.html` sha256 prefix (`shasum -a 256 dist/quiz.html`), live data counts (from the backup line), saved settings (theme/brand).
  - §12 status: what was done this session, what is verified, what is NOT done / waiting for the user, open questions.
  - test counts.
- [ ] `docs/INDEX.md`: every `src/js/*.js` module is listed (compare with `ls src/js`), "Task → where to edit" rows for new features. `python3 tools/symbols.py` if line numbers drifted a lot.
- [ ] `docs/ARCHITECTURE.md` / `DEPLOY.md` / `BACKUP.md` / `TROUBLESHOOTING.md`: updated if the protocol, process or a known problem changed.
- [ ] `docs/BACKLOG.md`: move done items to "Done", add new ideas the user mentioned.
- [ ] `CLAUDE.md`: new hard rules / user preferences learned this session (only lasting ones).
- [ ] Claude memory (`~/.claude/projects/.../memory/`): user preferences (e.g. "end every reply with the live link") are saved; nothing stale.

## 5. Commit + push
- [ ] `git add -A && git commit -m "Pack-up: docs + status (<date>)"` (attribution line from the system reminder). Never commit `backups/` or `.local/` (gitignored — check `git status` doesn't show them).
- [ ] `git push`; `git status` → clean, "up to date with origin/main".
- [ ] Wait for CI (~80 s) and re-run `python3 tools/health.py` if the push rebuilt the page.

## 6. Tell the user (short, Bengali)
- Backup folder + counts; tests; health; what's live; what's pending/open questions.
- How to start fresh: open a **new chat in this folder** and say what to change — Claude reads `CLAUDE.md` → `docs/PROJECT_CONTEXT.md` → `docs/INDEX.md` automatically.
- End with the live link: https://moazbinabdullah2003-lgtm.github.io/mock-exam/quiz.html
