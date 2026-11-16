# Quiz Server প্রজেক্ট — কী কোথায় আছে

Folder: `/Users/mac/claude code/quiz-server`

নতুন chat-এ এই project-এ কাজ করতে:
1. নতুন chat খুলে এই folder-টা select করো (Code tab → working directory = quiz-server)।
2. `NEW_CHAT_PROMPT.txt`-এর লেখা paste করো, শেষে "আমার কাজ:"-এর পর কী করতে চাও লিখো।
3. Claude শুধু `docs/PROJECT_CONTEXT.md` + `docs/INDEX.md` পড়বে, তারপর দরকারি ফাইল — তাই token কম লাগে।

| ফোল্ডার/ফাইল | কাজ |
|---|---|
| `docs/PROJECT_CONTEXT.md` | **সবার আগে এটা** — পুরো architecture, live link/ID, login/exam/settings কীভাবে কাজ করে, status, pitfalls |
| `docs/INDEX.md` | কোন ফাইলে কী + "কোন কাজে কোন ফাইল edit" টেবিল |
| `docs/ARCHITECTURE.md` | data flow, backend protocol, Sheet layout, data model |
| `docs/DEPLOY.md` | Deploy ও test করার proven ধাপ (Code.gs → Apps Script, quiz.html → GitHub) |
| `docs/BACKLOG.md` | ভবিষ্যতের আইডিয়া |
| `src/` | আসল source (css + js module) — edit এখানে |
| `build.py` | `python3 build.py` → `dist/quiz.html` |
| `dist/quiz.html` | live-এ যেটা যায় (generated) |
| `backend/Code.gs` | Google Apps Script কোড |
| `samples/` | CSV template, ৫০টা Higher-Math question (solution সহ) |
| `tools/` | md→CSV script, deploy patch script, browser test fake-backend |
| `tests/` | পুরোনো test (node লাগে, এখন outdated) |

Student link: https://moazbinabdullah2003-lgtm.github.io/mock-exam/quiz.html
Teacher login: ID `teacher`, password `teacher123` (Settings → Security থেকে বদলানো যায়)
