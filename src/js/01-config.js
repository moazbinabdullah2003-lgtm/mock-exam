/* ============================================================
   CONFIG  (teacher only edits this part)
   ============================================================ */
const CONFIG = {
  // RECOMMENDED: Google Apps Script Web App URL (Code.gs deploy করার পর যে /exec link পাবে)
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbx2xuErMRJf9XPij0Yt28hqLXf79oAN3MnQva2ERw4rTJLQsFrkmQwO6qpFxTCG3IRPjw/exec",
  // (পুরোনো Form পদ্ধতি — SCRIPT_URL থাকলে দরকার নেই) Google Form "Get pre-filled link" (see setup steps). Dummy values must be: SID,NAME,EXAM,AID,MODE,SCORE,TOTAL,SECS,DETAILS
  PREFILLED_LINK: "",
  // Google Sheet -> File -> Share -> Publish to web -> (Form Responses sheet) -> CSV -> paste link
  SHEET_CSV_URL: "",
  TEACHER_PASS: "teacher123"
};

/* Exam code (UPPERCASE) -> exam.
   minutes: timer | neg: negative mark per wrong (0 = none) | shuffle: question order random | open:false = close the exam
   Question: q = text, o = options, a = correct option index (0 = first), t = topic, e = explanation (optional) */
const EXAMS = {
  "DEMO1": {
    title: "Demo Mock Test", minutes: 5, neg: 0, shuffle: true, open: true,
    questions: [
      {q:"2x + 3 = 11 হলে x = ?", o:["2","3","4","5"], a:2, t:"Algebra", e:"2x = 8, x = 4"},
      {q:"sin 30° = ?", o:["1/2","√3/2","1","0"], a:0, t:"Trigonometry", e:"sin 30° = 1/2"},
      {q:"d/dx (x²) = ?", o:["x","2x","x²","2"], a:1, t:"Calculus", e:"Power rule"},
      {q:"x² − 5x + 6 = 0 এর roots কী?", o:["1,6","2,3","−2,−3","−1,6"], a:1, t:"Algebra", e:"(x−2)(x−3)=0"},
      {q:"cos 0° = ?", o:["0","1/2","1","−1"], a:2, t:"Trigonometry", e:"cos 0° = 1"},
      {q:"∫ 2x dx = ?", o:["x²+C","2x²+C","x+C","2+C"], a:0, t:"Calculus", e:"∫2x dx = x² + C"}
    ]
  }
};

