# SUPABASE_MIGRATION — moving the backend from Google Apps Script + Sheet to Supabase

> Started 2026-11-16. **Read this first if the user says "supabase", "migration", "dhap 0/1/2", or "Step N done".**
> Status line is at the bottom (§6). Update it every time a step finishes.

## 1. Why (decided with the user, 2026-11-16)
- The web app is slow: Apps Script ≈1.5–3 s per call, 5–15 s cold start, login sometimes stuck on "Checking…" until refresh, every read scans the whole Sheet.
- User's goals: **low cost, switch only once, good experience**. Paid subscription is OK later when students grow.
- Compared Firebase vs Supabase → **Supabase chosen**: SQL tables (close to the Sheet), server-side logic (Postgres functions / RPC) on the free plan (Firebase needs the Blaze card plan for Cloud Functions), fixed monthly price later (Pro ≈ $25/mo; check current pricing before upgrading).
- Known Supabase risks (told to the user): free project **pauses after 7 days without activity** → daily ping via GitHub Actions; free plan has almost no automatic backup → keep our own `backup.sh`; security rules (RLS) must be right; the service key must never leak (public repo!).

## 2. Plan (phases)
- **Dhap 0 (optional quick fixes on the current Apps Script system, cheap):** render home right after login and load the rest in the background; run startup calls in parallel (`refresh()` in `06` is sequential: loadCfg → loadRemote → loadExamList/loadReps or loadMyRep → ensureExams → flush); CacheService for settings/exams in `Code.gs`; time-trigger keep-warm. User may skip this and go straight to Supabase.
- **Dhap 1 (the migration, 2–3 sessions):**
  1. Tables: `attempts`, `questions` (or `exams` + `questions`), `settings` (cfg JSON, voids JSON, notify), `roster` (password **hashed**), `vault`, `reports`. Keep the same fields as the Sheet (see `docs/ARCHITECTURE.md`).
  2. Security: RLS so students only read their own attempts/vault/reports; teacher-only writes. Do the sensitive logic in Postgres functions (RPC): student login check, teacher check, saving attempts, hide/delete logs, report approve/void, rename exam. Ideally **server-side grading** (answer key not sent to the browser before submit).
  3. Frontend: keep the UI as is. Replace network calls with a single data layer (put everything in `src/js/03-sync.js` so a future switch only touches one file). Supabase JS from cdnjs/jsdelivr, or plain `fetch` to the REST/RPC endpoints.
  4. Data move: script that reads a fresh `backups/<stamp>/` folder and inserts into Supabase (service key from `.local/`, never committed).
  5. Tests: adapt `tests/` (fake Supabase layer), `tools/health.py`, `tools/backup.py`, `tools/restore.py`, `deploy*.sh`.
  6. Switch over when no exam is running, after a backup. Keep Apps Script alive read-only for a while as fallback.
  7. GitHub Actions daily ping so the free project never pauses.
- **Dhap 2 (later, only when needed):** Supabase Pro, custom domain, payments (bKash), class recordings page (YouTube unlisted first; Bunny Stream later for paid courses).

## 3. Secrets — hard rules
- The **database password** (set when the project was created) stays with the user only. Never ask for it in chat, never needed by Claude.
- **anon (public) key + project URL**: safe to put in the frontend (`src/js/01-config.js`) — security comes from RLS.
- **service_role key**: secret. The user puts it in `.local/supabase_service_key` (gitignored) themselves, using a step Claude gives (e.g. paste into a file via TextEdit/Terminal). Never in chat, never in the repo, never in the frontend.

## 4. How to guide the user (they cannot code)
Bengali/Banglish, short, **one step at a time**, wait for "done". Give exact button names. End every reply with the live link.

## 5. User setup steps (Supabase dashboard)
1. ✅ Account: supabase.com → Continue with GitHub (done 2026-11-16).
2. ⏳ New project: organization (Personal, Free) → project name `mock-exam`, **Generate a password** (user saves it privately), Region **Southeast Asia (Singapore)**, Plan Free → Create new project. (User was at this step when the session ended.)
3. Next: Project Settings → API (or "Connect") → user tells Claude the **Project URL** and **anon public key** (both safe to share).
4. Next: user saves the **service_role key** into `.local/supabase_service_key` (Claude gives the exact steps; not in chat).
5. Then Claude builds tables / RLS / functions (via SQL the user pastes in the SQL Editor, or via the REST API with the service key) and continues Dhap 1.

## 6. Status (update every step)
- 2026-11-16: decision made (Supabase). Step 1 done. Step 2 (create project) in progress — ask the user whether the project is created.
- Nothing changed in code yet for the migration. Live system is still Apps Script backend Version 10 (see `PROJECT_CONTEXT.md` §2).
- Login "Checking…" stuck issue: not fixed yet (cause = slow/cold Apps Script + sequential startup calls; see Dhap 0).
