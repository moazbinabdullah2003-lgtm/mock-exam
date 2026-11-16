# ARCHITECTURE — data flow, protocol, data model

(Overview diagram + module map: `PROJECT_CONTEXT.md` §3 and `INDEX.md`. This file = protocol & data details.)

## Data flow
```
Teacher UI edits ─ saveAll() ─POST savecfg/saveroster─▶ Code.gs ─▶ sheet "Settings" (rows: cfg | roster)
Student page load ─GET ?action=settings─▶ CFG (cached in LS mq_cfg) ─▶ applyTheme()/T()/rules everywhere
Login:   Student  GET ?action=login&sid&pin ─▶ roster check (server)           ─▶ SESS in LS mq_sess
         Guest    exam code ─▶ getExam ─▶ guest checks (client)                   ─▶ SESS{guest:true,sid:'G-XXXX'}
         Teacher  GET ?action=tlogin&key + client check of ID == CFG.access.teacherId ─▶ SESS{teacher:true,key}
Exams:   Teacher CSV/editor ─POST action=upload (rows in QHEAD order)─▶ sheet "Questions" (all rows of CODE replaced)
         Student code ─GET ?action=exam&code=X─▶ {title,minutes,neg,open,questions[]} ─▶ applyOv(overrides from CFG.exams[CODE])
Attempt: startRun() ─RUN (LS mq_run)─▶ finish() ─▶ rec ─▶ LS mq_local + mq_out ─flush(): POST no-cors─▶ doPost ─▶ sheet "Attempts"
Read:    loadRemote(): student GET ?sid=ID (own rows)  |  teacher GET ?key=PASS (all rows) ─▶ REMOTE[]; allRecs() = REMOTE ∪ local (dedupe by aid)
```
The page never reads POST responses (no-cors). Teacher writes are verified by re-GET (`verifyExam`, `saveAll`, `changePass`).

## Backend protocol
See the table in `PROJECT_CONTEXT.md` §4 (authoritative list of GET/POST actions). Notes:
- Admin POSTs with a wrong/missing `key` are ignored (`denied`). GET without `key`/`sid` returns `[]`.
- `action=login` is public by design (it only returns ok/name). It does not rate-limit.
- `getExam_` returns the correct answers (client-side grading) — known limitation.
- `doPost` takes a script lock; dup `aid` ignored (`dup`).

## Sheets (auto-created on first request by `ss_()/sheet_()/qsheet_()/kvSheet_()`)
- **Attempts**: Timestamp, SID, NAME, EXAM, AID, MODE, SCORE, TOTAL, SECS, DETAILS(JSON). Columns B:E text format.
- **Vault** (since 2026-11-16): SID, TS, DATA1..DATA20 — one row per student, vault JSON split into ≤45,000-char cells.
- **Questions** (`QHEAD`, 21 columns since 2026-11-16): CODE, TITLE, MINUTES, NEG, OPEN, Q, A, B, C, D, E, ANS(letter), TOPIC, EXPLANATION, Q_BN, A_BN, B_BN, C_BN, D_BN, E_BN, EXPLANATION_BN (Q/A–E/EXPLANATION = English main version; *_BN = optional বাংলা version, same option order; empty = single-language question). Old 14-column sheets are migrated on the next write (columns matched by header name). TITLE/MINUTES/NEG/OPEN only on the first row of each CODE. Whole sheet is text format; `admin_` rewrites the sheet on upload/delete/setopen. Seeded with DEMO1.
- **Settings**: header `KEY | VALUE`; row `cfg` = public settings JSON, row `roster` = `[{id,pin,name,blocked}]` JSON (never returned except to the teacher). Script properties: `SSID`, `TPASS`.

## Client data model
- attempt rec: `{aid,sid,name,exam,mode:'full'|'mistakes',score,total,secs,d:[[qIdx,chosen(-1=skipped),correct(0/1),secsOnQ]]}`; `aid = Date.now().toString(36) + 2 random chars` (time = `aidTime(aid)`).
- `qIdx` = row position of the question within its CODE. Chosen option is the ORIGINAL option index (option shuffle is only a view permutation `RUN.op[qIdx]`).
- score = correct − wrong × NEG (skips free). `norm()` normalises IDs (trim, upper-case, strip leading zeros) — so `0001` ≡ `1`.
- Mistakes retake: `wrongIdx(sid,exam)` = questions whose LATEST result is wrong/skipped; timer = proportional share of the exam minutes.
- localStorage keys: `mq_sess` login · `mq_run` running exam · `mq_local` own attempts · `mq_out` unsent queue · `mq_exams` exam cache (offline start) · `mq_cfg` settings cache · `mq_gid` guest id · `mq_lo_<sid>_<exam>_<mode>` last question order (to avoid identical consecutive orders).
- Globals (05-state-render.js and others): `SESS, RUN, view('login'|'home'|'quiz'|'result'|'teacher'), BACK, LAST, TM, TF, TSTU, EXL, UP, PASTE, upMsg, DELC, msg, loading, confirming, syncMsg, TTAB`; `LMODE, introFor` (06); `CFG, DIRTY` (02a); `CD, ROSTER, ROSTER_OK, SO, saveMsg, EDX` (13); `NETERR, LASTERR, DIAG` (03). `render()` writes `#app.innerHTML` from `vLogin|vHome|vQuiz|vResult|vTeacher`, then `mathify()`.
- Views are template-string functions; handlers are inline `onclick="fn()"` → all functions are global (not ES modules). Attribute values from data go through `eA()`/`data-*`.

## Legacy
`PREFILLED_LINK` / `SHEET_CSV_URL` (Google Form + published-CSV path in `03-sync.js`) are superseded by `SCRIPT_URL`; kept as fallback, safe to delete.

## Known limitations
Answers visible in page/network (client-side grading); student passwords plain text in the sheet; `login` unthrottled; no images in questions; Apps Script latency ~2 s; Apps Script daily quota applies.
