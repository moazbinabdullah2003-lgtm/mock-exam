# BACKUP — what is saved, where, how to restore

## What lives where
| Thing | Master copy | Other copies |
|---|---|---|
| Source code (`src/`, `backend/Code.gs`, docs, tests, tools, scripts) | this Mac folder | GitHub repo `mock-exam` (public, full history) + every backup's `project-source.tar.gz` |
| Live data: settings, roster (student passwords), exams + questions, attempts/results | **Google Sheet "MCQ Mock Data"** (+ Script properties) | only in `backups/<time>/` on this Mac |
| Live site / backend | GitHub Pages / Apps Script | rebuildable from source with `./deploy.sh` / `./deploy-backend.sh` |

The Sheet is the only thing that exists nowhere else — that is what backups protect.

## Taking a backup
`./backup.sh` (= `python3 tools/backup.py [--keep 30]`). Reads the live backend with the teacher key (`.local/teacher_key`, gitignored; keep it equal to the current teacher password, update it if the password is changed in Settings → Security) and writes `backups/YYYY-MM-DD_HHMMSS/`:
`settings.json`, `roster.json`, `exams_list.json`, `exams/<CODE>.json` (full questions), `attempts.json` + `attempts.csv` (open in Excel), `Code.gs`, `project-source.tar.gz` (whole folder), `manifest.json` (counts, sha256 of Code.gs / dist / live page, git commit). Keeps the newest 30. Retries on Google's flaky HTML error pages; aborts loudly if anything cannot be read.

`backups/` and `.local/` are gitignored: they hold student passwords and must never go to GitHub. Optional extra safety: let Time Machine/iCloud include the folder.

## When (rules for Claude)
Not after every edit. Finish the whole batch of work → ask the user once → run the backup. Also ask before risky operations, and suggest one when the newest backup is >7 days old. Report the counts printed on the last line (`{"exams":..,"questions":..,"students":..,"attempts":..}`).

## Restore
1. Pick the folder in `backups/`. 2. Dry run: `python3 tools/restore.py backups/<stamp>` (prints what it would write). 3. Real: add `--yes`; restrict with `--only settings,roster,exams,attempts`. It writes via the normal teacher API (savecfg / saveroster / upload / result POST), replaces the roster and the listed exams wholesale, and re-adds attempts de-duplicated by `aid`. Exam restore is verified lossless (round-trip test). 4. Verify with the test student (`9999`) and a read-only GET.
Code restore: `tar xzf project-source.tar.gz`, or `git clone` the repo, then `./deploy-backend.sh` + `./deploy.sh`.
Sheet itself deleted: create a new one by calling the backend once (it auto-creates "MCQ Mock Data" and stores `SSID`), then restore.
