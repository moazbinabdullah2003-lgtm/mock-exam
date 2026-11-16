# Quiz Server — আপনার গাইড (বাংলায়)

Folder: `/Users/mac/claude code/quiz-server`  ·  Student link: https://moazbinabdullah2003-lgtm.github.io/mock-exam/quiz.html

## নতুন chat-এ কীভাবে কাজ শুরু করবেন
1. নতুন chat খুলে working directory হিসেবে **এই `quiz-server` ফোল্ডার** select করুন।
2. প্রথম মেসেজে শুধু কাজটা লিখুন (যেমন "result page-এর রং বদলাও")। Claude নিজে `CLAUDE.md` পড়ে সব বুঝে নেয়। না পড়লে বলুন: **"CLAUDE.md পড়ো"**।
3. Claude edit → test → deploy → live যাচাই → docs update সব নিজে করবে। আপনাকে code দেখতে হবে না।

## কোনো সমস্যা হলে (ছোট হোক বড় হোক)
Claude-কে এই তিনটা জানান, তাহলে দুজনে দ্রুত ঠিক করা যাবে:
1. **Screenshot** বা স্ক্রিনে যা লেখা আছে হুবহু (`[ ]`-এর ভেতরের লেখা সহ)।
2. কে (student/teacher), কোথায় (ফোন/laptop, WiFi/mobile data, কোন browser)।
3. কী করছিলেন (কোন exam code, কোন student ID)।

Claude প্রথমে `python3 tools/health.py` চালিয়ে দেখে কোথায় সমস্যা, তারপর `docs/TROUBLESHOOTING.md`-এর টেবিল ধরে ঠিক করে।

## যা মনে রাখবেন
- **Test student:** ID `9999`, Password `test1234`। Claude প্রতিটা update-এর পর এটা দিয়ে পরীক্ষা করে, আপনিও পারেন। এর result dashboard-এ "Test Student" নামে আসবে।
- **Student ID শুধু সংখ্যা** হবে, অক্ষর নয়।
- **Teacher password বদলালে** Claude-কে জানান (backup script-এ নতুনটা দিতে হবে)।
- **Backup:** কাজের একটা ব্যাচ শেষ হলে Claude একবার জিজ্ঞেস করবে "backup নেব?" — "হ্যাঁ" বললে `backups/` ফোল্ডারে data ও project-এর কপি জমবে। ৭ দিনের বেশি পুরোনো হলে Claude মনে করিয়ে দেবে। Backup GitHub-এ যায় না (student password আছে)।
- **মাঝে মাঝে আপনার একটা কাজ লাগতে পারে** (Claude ধাপে ধাপে বলবে): GitHub token-এর মেয়াদ শেষ হলে নতুন token, বা `clasp login`।
- **Mac চালু থাকতে হবে** — deploy ও backup আপনার Mac থেকেই হয়।

## ফোল্ডারে কী কোথায়
| ফাইল/ফোল্ডার | কাজ |
|---|---|
| `CLAUDE.md` | Claude-এর জন্য মূল নিয়ম (workflow, deploy, backup, কড়া নিয়ম) |
| `docs/PROJECT_CONTEXT.md` | পুরো architecture, live link/ID, status — Claude এটা আগে পড়ে |
| `docs/INDEX.md` | কোন কাজে কোন ফাইল edit হবে |
| `docs/ARCHITECTURE.md` | data কীভাবে চলে, Sheet-এর গঠন |
| `docs/DEPLOY.md` | deploy ও test |
| `docs/BACKUP.md` | backup ও restore |
| `docs/TROUBLESHOOTING.md` | সমস্যা → কারণ → সমাধান |
| `docs/BACKLOG.md` | ভবিষ্যতের আইডিয়া |
| `src/` | আসল source (এখানেই edit হয়) |
| `backend/Code.gs` | Google Apps Script-এর কোড |
| `dist/quiz.html` | live-এ যে ফাইল যায় (নিজে তৈরি হয়, হাতে বদলাবেন না) |
| `tests/` | automatic test (deploy-এর আগে নিজে চলে) |
| `tools/` | health check, backup, restore ইত্যাদি script |
| `deploy.sh`, `deploy-backend.sh`, `backup.sh` | এক command-এ deploy / backup |
| `samples/` | CSV template আর ৫০টা Higher-Math প্রশ্ন |
| `backups/`, `.local/` | শুধু আপনার Mac-এ (backup ও teacher key), GitHub-এ যায় না |

## Teacher login
ID `teacher`, password `teacher123` (Settings → Security থেকে বদলানো যায়)। Theme, text, rule, student, exam সবই teacher panel থেকে বদলান, code লাগে না।
