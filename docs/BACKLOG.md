# BACKLOG (ideas only — NOT decided; ask the user before doing any)
- Done so far: login choose screen, guest name, student profile, test-student switch, exam rename, per-exam + time analytics, copy-for-AI, keyboard quiz, UI redesign + theme gallery, KaTeX math, always-on option shuffle, per-exam rules (window, attempt limit, intro), roster login, teacher control panel (theme/texts/rules/students), in-app exam editor, CSV export, error diagnostics, auto-deploy, tests, backup/restore, health check.
- Security: server-side grading (answers are currently visible in the page/network); hashed passwords + login rate-limit; teacher password out of the client.
- Exams: hide results until teacher releases; question images; stable question IDs (instead of row index) so questions can be edited/reordered safely.
- Analytics: per-exam trend over time, leaderboard (per-exam ranking + time analytics are DONE).
- UX: PWA/offline, nicer charts, Bengali digits/UI toggle, student self-registration, bulk delete attempts.
- Cleanup: remove the legacy Google-Form/CSV path from `03-sync.js`.
- Open question to the user: should the review screen show options in the order the student saw (shuffled) instead of A-B-C-D?
