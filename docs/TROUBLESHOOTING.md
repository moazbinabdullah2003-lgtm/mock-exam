# TROUBLESHOOTING — small problems, fast fixes (for the user + Claude together)

**First move for ANY problem:** `python3 tools/health.py` (read-only, ~20 s). It checks the live page, backend, teacher key, test student login and backup age, and names what is broken. Then use the table.

## What the user should send Claude (the faster the better)
1. A **screenshot** or the exact message on screen (anything in `[brackets]` like `[blocked: …]` is a diagnostic tag — copy it).
2. Who/where: student or teacher, phone or laptop, WiFi or mobile data, which browser (Messenger/Facebook in-app browser is a common cause).
3. What they were doing, and the exam code / student ID if relevant.

## Symptoms → cause → fix
| Symptom | Likely cause | Check / fix |
|---|---|---|
| Student: "Network nei" / "Server-এ পৌঁছানো যাচ্ছে না" | student's network blocks Google, in-app browser (Messenger/Facebook), VPN/ad-blocker, old cached page | health.py OK ⇒ server is fine. Ask them to open the link in **Chrome/Safari**, switch WiFi↔mobile data, turn off VPN/ad-block, hard-refresh. On the login page the app has a **Connection check** (`diag()` in `03-sync.js`): ask for its output |
| Student: "Server সমস্যা"/`[badresp …]` | Google returned an HTML error page (quota, maintenance, a flaky moment) | retry in a minute; if health.py also fails, wait — Apps Script daily quota resets; check script.google.com → Executions |
| Student can't log in | ID not in roster, wrong/empty password, blocked | teacher panel → Students; or read roster (`?action=roster&key=…`). IDs are numbers only; `0001` ≡ `1` |
| Student sees old version after an update | browser cache | hard refresh / open with `?v=2`; `health.py` first line shows whether the live file is the new one |
| Exam code not found / closed | wrong code, exam closed, guest not allowed for that exam | teacher panel → Exams (open/close); codes are case-insensitive |
| Result not shown to teacher | attempt still in student's outbox (`mq_out`) because the student was offline; it auto-sends later | teacher dashboard → refresh; check `attempts.json` via `?key=…` |
| Teacher changes don't "stick" | Save all changes not pressed, or backend write failed (the app verifies by re-reading and says so) | press **Save all changes**; if it reports a failure run health.py |
| Forgot teacher password | — | Apps Script → Project Settings → Script properties → delete `TPASS` ⇒ falls back to `teacher123`. Afterwards update `.local/teacher_key` |
| Changed teacher password | backup/health scripts use the old one | write the new password into `.local/teacher_key` (plain text, one line) |
| `deploy.sh`: tests failed | a real bug, or a test needs updating for intentional behaviour change | read the FAIL lines, fix code or the scenario in `tests/scenarios.js` / `tests/backend.test.js`; never skip tests |
| `deploy.sh`: push rejected / authentication failed | GitHub token expired or revoked | user: github.com/settings/personal-access-tokens → `quiz-deploy` → Regenerate, then `git push` once in Terminal (Username = GitHub name, Password = token) |
| `deploy-backend.sh`: not logged in / invalid_grant | clasp login expired | user runs `export PATH=/opt/homebrew/bin:$PATH && clasp login` once |
| `deploy-backend.sh`: "User has not enabled the Apps Script API" | switch is off | script.google.com/home/usersettings → Google Apps Script API → On |
| Live page did not update after `deploy.sh` | Actions still running or failed | github.com/moazbinabdullah2003-lgtm/mock-exam/actions → "Deploy quiz"; wait ~1 min; open the failing run's log |
| `node: command not found` in Claude's shell | Homebrew path missing | `export PATH=/opt/homebrew/bin:$PATH` (scripts already do it) |
| Backup says "Teacher key rejected" | `.local/teacher_key` differs from current teacher password | fix the file, rerun |
| Backend returns HTML for some request | Google transient error | retry (scripts retry automatically); if persistent, check Apps Script → Executions for the real exception |
| Everything is broken after a bad change | — | `git log` → `git revert <commit>` then `./deploy.sh`; backend: restore previous `Code.gs` from git / `backups/<t>/Code.gs` then `./deploy-backend.sh`. Data: `docs/BACKUP.md` restore |

## Rules while fixing
- Reproduce first (tests/health.py/live read-only GET), fix in `src/` or `backend/Code.gs`, add a test for the bug, deploy, verify with the test student (`9999`/`test1234`), update docs.
- Never use Apps Script "New deployment" (it changes the /exec URL and breaks every student's link).
- Before anything destructive on live data, ask the user and run `./backup.sh` first.
- Do not write test data to the real Sheet except as the test student.
