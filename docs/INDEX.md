# INDEX — where things live

Build: `python3 build.py` concatenates `src/js/*.js` (**filename order**) into `dist/quiz.html`. Line numbers are per module file and **approximate** (regenerate with the one-liner at the bottom). Overview/architecture: `PROJECT_CONTEXT.md`.

| Module (src/js/) | Purpose | Top-level symbols (line) |
|---|---|---|
| `01-config.js` | CONFIG (SCRIPT_URL, legacy TEACHER_PASS fallback, legacy Form/CSV keys) + built-in fallback EXAMS (DEMO1) | CONFIG:4, EXAMS:17 |
| `02-helpers.js` | Tiny utils: $, esc (HTML-escape + \n→<br>), norm, LS (localStorage wrapper), fmt, pct, avg, heat, shuffle, aidTime, newAid, LET, parseCSV, **mathify** (KaTeX auto-render) | esc:5, norm:6, LS:7, fmt:12, pct:13, avg:14, heat:15, shuffle:16, aidTime:17, newAid:18, LET:19, parseCSV:21, mathify:38 |
| `02a-cfg.js` | **Settings engine**: PRESETS/FONTS, DEF_CFG (theme/brand/text/access/rules/exams), TX (all UI labels) + T(key), deepMerge, CFG/DIRTY, applyTheme, setCfg/loadCfg, per-exam overrides (exOv/applyOv/canStart/introOf), vNotice | PRESETS:4, FONTS:14, DEF_CFG:20, TX:30, T:41, deepMerge:43, DIRTY:51, CFG:52, applyTheme:54, setCfg:67, loadCfg:74, exOv:84, applyOv:85, attemptsOf:91, canStart:93, introOf:101, vNotice:102 |
| `02b-motif.js` | **Science motif** (background symbols): MOTIFS (math/physics/chemistry/biology/circuit/periodic/graph/blueprint/mix: symbols `s`, shapes `sh`, hero watermark), ELEMS, MOTIF_SHAPES (atom/hex/bond/wave/helix/cell/curve/axes/trace/chip/res/elem), motifSVG(kind,color) seeded SVG tile, motifURL (cached data URL, no raw quotes), motifCSS(theme) → `--motif --mop --msz --msym`. Used by applyTheme (02a) + gallery (13). CSS: `body.has-motif::before`, hidden in exam (`body.in-quiz`) unless `theme.motifQuiz` | MOTIFS, motifSVG, motifURL, motifCSS |
| `03-sync.js` | **Network**: jget (timeout+typed errors), describeErr, netFail/errBox/diag (Connection check); legacy FORM; send/flush outbox; loadRemote; allRecs (REMOTE ∪ local) | INAPP:4, jget:6, describeErr:23, NETERR:32, netFail:33, errBox:34, diag:37, FORM:54, CAN_SYNC:62, send:63, flushing:80, flush:81, REMOTE:92, loadRemote:93, allRecs:122 |
| `04-analytics.js` | qinfo(exam,idx), topicStats(recs), wrongIdx(sid,exam) | qinfo:4, topicStats:5, wrongIdx:14 |
| `04a-lang.js` | **🌐 Bilingual questions**: LANGS, isBi(exam), LQ(q, lang) (bn view with English fallback per field), LANGASK + chooseLang + vLangAsk (language popup before a bilingual exam; rendered by render() in 05), RVLANG + vLangSwitch (result review language), prefLang (`mq_lang`) | isBi, LQ, chooseLang, vLangAsk, vLangSwitch |
| `05-state-render.js` | Global state vars + render() router (view: login|home|quiz|result|teacher); keeps typed inputs (KEEP list); footer; mathify; editor previews | SESS:5, view:6, EXL:7, TTAB:8, msg:9, render:11 |
| `06-views-login-home.js` | TKEY, banner, **login (3 tabs Student/Guest/Teacher)**: vLogin/doLogin/doGuest/doTeacher/logout/refresh; vHome (+guest home, intro popup), startGuest, getExam, ensureExams, startCode, startRun (**always shuffles Q+options**), retake | TKEY:4, banner:5, LMODE:10, gid:11, setLM:12, vLogin:13, doLogin:30, doGuest:42, doTeacher:59, logout:74, refresh:75, vHome:82, startGuest:102, introFor:111, getExam:113, ensureExams:123, startCode:128, RUNKEY:143, startRun:144, retake:167 |
| `07-view-board.js` | vBoard(sid,isT) student/teacher-drilldown analytics; openRec(aid) | vBoard:2, openRec:35 |
| `07a-view-profile.js` | **Teacher's student profile** (`vProfile(sid)`): auto summary, stats, trend chart, exam-wise, topic strong/weak vs class, still-wrong questions, slow questions, full activity log; `trendOf`, `trendTag` | pcol, trendOf, trendTag, vProfile |
| `07b-time-analytics.js` | **⏱ Time analytics block** `vTimeBlock(recs,id,{cmp,stu})` used on dashboard (`d_time`), exam page (`ea_time`), profile (`p_time`, vs class), student board (`b_time`), result (`r_time`): tiles, topic-wise time, question-wise time per exam (slowest first), student-wise time table; helpers `topicTime`, `stuTime`, `secS` | secS, topicTime, stuTime, vTimeBlock |
| `08-quiz.js` | vQuiz (shuffled option view), pick/go/addTime, startTimer/tick, finish() (scoring + save record) | vQuiz:2, pick:17, addTime:22, go:27, startTimer:31, tick:32, finish:39 |
| `08a-vault.js` | **🔖 Saved-question vault + ✕ exam exit**: vault in LS `mq_vault_<sid>` {ts, folders, items[{id:'EXAM#qi', f, ex, qi, at, title, q:snapshot}]}, synced to backend (`action=vault` GET / `savevault` POST, auth ID+password from `SESS.pin` or teacher key for test student; newer `ts` wins: vPull/vPush). saveQ/doSaveQ/vSavePopup (folder chips + new folder), vSaveBtn (quiz + result review), vVault page (`view='vault'`: folder filter, rename/delete folder, move, remove, copy for AI, EN/বাংলা), answers shown only after the student submitted that exam (vSeen). Exit: EXITING popup → finish (submit) or cancelRun (discard, not counted) | saveQ, vVault, vPull, vPush, cancelRun, vExitPopup |
| `09-result.js` | vResult(rec): score, topic-wise, per-question review honouring rules.review/showScore/passMark/explain | vResult:2 |
| `09a-copy-ai.js` | **📋 Copy for AI**: `copyText` (clipboard + fallback), `aiQ` (one question as Markdown+LaTeX with my/correct answer + solution), `aiHead`, `copyRes(n)` (result page; obeys rules.review/explain for students), `copyExam(code,n)` (teacher exam page), `aiHint` card | copyText, aiQ, aiHead, copyRes, copyExam, aiHint |
| `10-teacher-dashboard.js` | vTeacher: tab router (Dashboard content lives here: students table, topic accuracy, heatmap, hardest questions, CSV button); openStu | openStu:2, vTeacher:3 |
| `10a-exam-analytics.js` | **Per-exam analytics** (`EXA` state, `openExA`, `vExamAnalytics`): tiles, student-wise ranking (best/1st/last/time, Review, → profile), folds: score distribution, topic-wise, question-wise (✔✘⏭, common wrong option, avg time, Hardest/Easy tags), student×question grid. Opened by tapping an exam in Exams tab | EXA, openExA, vExamAnalytics |
| `10b-exits.js` | **🚪 Exit report (teacher)**: exitInfo(rec) (answered/correct/seen/time, flags: submitted same exam later, repeated exits, saw ≥50% questions, answered ≥50%), vExitTable, exitBySt, vExitDash(exam) (dashboard + exam analytics section), vExitProfile(sid) (student profile), exitCount | exitInfo, vExitDash, vExitProfile |
| `11-teacher-exams.js` | Exam mgmt: tPost, loadExamList, parseQ (CSV validate), rowsOf, onFile/doPreview/verifyExam/publishUp, setOpen, delExam, vExams (list + CSV upload) | escT:2, sleep:3, tPost:4, loadExamList:8, parseQ:12, rowsOf:45, onFile:46, doPreview:47, verifyExam:48, publishUp:58, setOpen:71, delExam:76, vExams:82 |
| `11a-ai-prompt.js` | **🤖 AI prompt + MD exam import**: MD_SAMPLE, CSV_SAMPLE, AI_COMMON (rules: LaTeX `$…$`, verify/solve answers, solutions, topics), aiPrompt('md'\|'csv'), isMD, parseMD (format: `# EXAM: CODE` + TITLE/MINUTES/NEG/OPEN, then `## Qn` / TOPIC: / Q: / A)…E) / ANS: / SOL:, multi-line Q/SOL, ignores code fences + text outside questions), vAiPromptBox (copy buttons + sample in Exams tab). parseQ (11) hands MD text to parseMD. **Exam rules from upload**: RULE_KEYS (MAXATTEMPTS, GUEST, START, END, INTRO — MD header lines or CSV columns, first row), upDate, readRules → `ex.ov` (null = file has no rule keys → existing rules untouched), rulesTxt (preview line), saveExamRules (after publish: merges into backend settings `cfg.exams[code]`, verifies, updates CFG/CD) | aiPrompt, isMD, parseMD, readRules, saveExamRules, vAiPromptBox |
| `13-teacher-settings.js` | **Teacher control panel**: tabs, field builders fT/fA/fN/fC/fR/fS/fK, sp() draft edit + live preview, saveAll (cfg+roster, verified), vSettings, changePass, roster UI (rset/radd/rdel/rbulk/rgen/rfromAttempts), vStudents, exportCSV | CD:4, eA:5, clone:6, gp:7, sp:8, fT:16, fA:17, fN:18, fC:19, fR:20, fS:21, fK:22, sec:23, vTabs:25, gotoTab:29, loadRoster:35, vSaveBar:43, saveAll:47, applyPreset:69, resetSec:73, vSettings:80, changePass:108, rset:122, radd:123, rdel:124, rbulk:125, rgen:135, rfromAttempts:139, vStudents:145, exportCSV:167 |
| `14-exam-editor.js` | **In-app exam editor**: openEditor, question cards (eset/eopt/edAdd/edDel/edDup/edMove/edOpt), per-exam rules, live KaTeX preview, saveExam (re-upload + verify) | openEditor:4, blankQ:20, eset:21, eopt:22, markDirtyEd:23, edPrev:24, edAdd:30, edDel:31, edDup:32, edMove:33, edOpt:34, edHead:40, vExamEditor:41, saveExam:70 |
| `99-boot.js` | boot(): applyTheme, restore session / resume running exam / initial refresh. **MUST load last** | boot:4 |

Other source: `src/css/app.css` (theme variables `--p --bg --card --t --m --b --rad …`, plus `.tabs .sec .fld .qed .notice .savebar` etc.), `src/template.html` (KaTeX css/js from cdnjs), `backend/Code.gs`.

## Task -> where to edit (open ONLY these)
| Task | Edit |
|---|---|
| Overall look / folds / tiles / animation | `src/css/app.css`; `sec()` (`13`), `tile()` (`07`), `vHero()` (`06`); teacher-editable style keys in `DEF_CFG.theme` + `applyTheme` (`02a`) + fields in `vSettings` (`13`) |
| Colors / layout / mobile look (defaults) | `src/css/app.css` (+ markup strings in the view module). Teacher-editable look: `PRESETS`/`DEF_CFG.theme`/`applyTheme` in `02a-cfg.js` |
| English + বাংলা questions | data: backend QHEAD `*_BN` columns (`Code.gs` getExam_), upload rows `rowsOf` (11), parse `bnErr` + `[BN]` block (11a), view `LQ`/language popup (04a), quiz `vQuiz` (08), review `vResult` (09), editor `.bnx` section (14) |
| Exit records / cheating flags | record: `cancelRun` (`08a`) → mode `exit`/`exit-mistakes` in Attempts via the normal outbox; `isExit`/`allRaw`/`allExits` + `allRecs` excludes exits (`03`); report `10b-exits.js` |
| Saved questions / folders / exam exit | `08a-vault.js`; backend `getVault_`/`saveVault_` (sheet `Vault`: SID, TS, DATA1..20 chunks of 45k chars) |
| AI prompt text / MD exam format | `11a-ai-prompt.js` (keep MD_SAMPLE/CSV_SAMPLE parseable — tests check both) |
| Science background symbols / new science theme | add symbols/shapes to `MOTIFS` / `MOTIF_SHAPES` in `02b-motif.js`; a full science preset = PRESETS entry with `sci:1` + `motif`,`motifInk`,`motifOp`,`motifSize` (`02a`); controls in `vSettings` (`13`) |
| Colorful boxes / symbols inside boxes | theme keys `boxStyle` (plain/tint/rainbow/bold), `c2 c3 c4` (palette), `boxSym`, `boxSymOp` (`02a` DEF_CFG + applyTheme body classes `box-*`); CSS block "Colorful boxes" at the end of `app.css` (`--cc` = each box's color, cycles by nth-child) |
| **Add a teacher-editable setting** | default in `DEF_CFG` (`02a`) → field in `vSettings()` (`13`) → use `CFG.x.y` where needed. No backend change |
| **Change a button/label text** | add to `TX` (`02a`), use `T('key')`; it becomes editable in Settings → Texts automatically |
| Quiz keyboard shortcuts / option numbers | `08-quiz.js` `onQuizKey`, `vQuiz` (+ `.kbhint` in css) |
| Time analytics (everywhere) | `07b-time-analytics.js` `vTimeBlock` (+ `qTimeStats` in `04`); review shows `Ns` per question in `09-result.js` |
| Timer, scoring rule, what is saved per attempt | `08-quiz.js` (`tick`, `finish`); NEW saved field also: `03-sync.js` (`send`, `loadRemote` mapping) + `backend/Code.gs` (HEAD, doPost, doGet) + new column in Attempts |
| Shuffle logic / exam start checks / guest home | `06-views-login-home.js` (`startRun`, `startCode`, `startGuest`, `vHome`), `02a-cfg.js` (`canStart`, `applyOv`) |
| Question screen (math/LaTeX, options) | `08-quiz.js` `vQuiz`, `09-result.js` review, `esc()`/`mathify()` in `02-helpers.js` |
| Result/review rules | `09-result.js` + `rules.*` in `02a`/`13` |
| Student analytics cards (student's own view) | compute in `04-analytics.js`, render in `07-view-board.js` |
| **Teacher's view of one student (profile)** | `07a-view-profile.js` `vProfile`; opened by `openStu(sid)` from the dashboard table or the 👤 Profile button in Students tab (`13`) |
| Teacher analytics / tables / CSV export | `10-teacher-dashboard.js` (+ `04-analytics.js`), `exportCSV` in `13` |
| **Login rules** (student ID+password, guest, teacher ID) | `06-views-login-home.js` (`vLogin`, `doLogin`, `doGuest`, `doTeacher`) + `login_()`/`tlogin` in `backend/Code.gs` |
| Teacher → test student switch | `06-views-login-home.js` `asTestStudent`/`backToTeacher`, button in `10-teacher-dashboard.js` header |
| Roster / student management UI | `13-teacher-settings.js` (`vStudents`, `r*` functions) + backend `saveroster`/`roster`/`login_` |
| CSV question format / validation | `11-teacher-exams.js` `parseQ`,`rowsOf`; backend `admin_`,`getExam_`,`QHEAD`; `samples/questions_template.csv` |
| In-app exam editor (incl. changing the exam code: `edCode`/`saveExam`; backend `rename` in `admin_`) | `14-exam-editor.js` |
| Copy exam/question for AI | `09a-copy-ai.js`; buttons in `09-result.js` (review) and `10a-exam-analytics.js` |
| One exam's analytics | `10a-exam-analytics.js` (button/row in `vExams`, `11`) |
| Exam list actions (close/delete/…) | `11-teacher-exams.js` `vExams`,`setOpen`,`delExam`; backend `admin_` |
| Network error messages / Connection check | `03-sync.js` (`jget`, `describeErr`, `netFail`, `diag`) |
| New backend endpoint | `backend/Code.gs` `doGet`/`doPost`/`admin_` + a client call (`jget` in `03`/`06`, `tPost` in `11`) — then deploy backend FIRST |
| Start-up / session resume | `99-boot.js`, `05-state-render.js` |
| Teacher password / teacher ID | UI: Settings → Security (`changePass` in `13`; stored as Script property `TPASS`; ID = `access.teacherId`). Default const `TEACHER_PASS` in `Code.gs` (+ legacy fallback in `01-config.js`) |

After any edit: `python3 build.py`, run tests, deploy with `./deploy.sh` / `./deploy-backend.sh` (see `CLAUDE.md`).
Backend functions (Code.gs): `pass_ ss_ sheet_ qsheet_ norm_ doPost doGet getExam_ json_ admin_ listExams_ kvSheet_ kvGet_ kvSet_ login_`.

Regenerate the symbol list: `python3 tools/symbols.py`.

## Operations files (not part of the app)
| File | Purpose |
|---|---|
| `CLAUDE.md` | master rules + workflow + backup policy (read first) |
| `deploy.sh` / `deploy-backend.sh` | test → deploy frontend (git push → Actions → Pages) / backend (clasp push + move /exec deployment) |
| `backup.sh` → `tools/backup.py` | full live-data + project backup into `backups/<time>/` |
| `tools/health.py` | read-only live health check (page hash, backend, teacher key, test student, backup age) |
| `tools/restore.py` | restore a backup (dry run by default, `--yes` to write) |
| `tests/gas_harness.js` | runs the real `Code.gs` under node with in-memory Sheet fakes |
| `tests/backend.test.js` | 58 backend logic tests |
| `tests/run_tests.js` + `tests/scenarios.js` | frontend flow tests against the real backend (add scenarios at the bottom; assertions are `TT.ok/TT.eq`) |
| `.github/workflows/pages.yml` | CI: tests → build → publish to Pages |
| `.clasp.json` | Apps Script project link (rootDir `backend`) |
| `docs/PACKUP.md` | end-of-session pack-up checklist ("pack koro") |
| `docs/DEPLOY.md`, `docs/BACKUP.md`, `docs/TROUBLESHOOTING.md` | shipping, backups/restore, symptom→fix table |
