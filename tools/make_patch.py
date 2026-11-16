#!/usr/bin/env python3
"""Deploy helper: make a SMALL patch (JSON ops) that turns the currently-LIVE quiz.html into the new dist/quiz.html.

Why: pushing the whole 80 KB file through the browser tool is slow/error-prone. A patch is usually 2-10 KB.

Usage (from project root):
    curl -s "https://moazbinabdullah2003-lgtm.github.io/mock-exam/quiz.html?x=$RANDOM" -o /tmp/live.html
    python3 tools/make_patch.py /tmp/live.html dist/quiz.html > /tmp/ops.json
It prints (stderr) the sha256 of the live file and of the new file, and (stdout) the ops JSON:
    [[start, end, "replacement"], ...]   # offsets are UTF-16 code units of the LIVE file (what JavaScript uses)
Then see docs/DEPLOY.md section "Frontend deploy" for the JS snippet that applies the ops inside the GitHub editor
and verifies the sha256 before committing.
"""
import sys, json, hashlib
from difflib import SequenceMatcher

old = open(sys.argv[1], encoding='utf-8').read()
new = open(sys.argv[2], encoding='utf-8').read()
sys.stderr.write('live sha256: %s\nnew  sha256: %s\n' % (hashlib.sha256(old.encode()).hexdigest(), hashlib.sha256(new.encode()).hexdigest()))
ol, nl = old.splitlines(True), new.splitlines(True)
u16 = lambda s: len(s.encode('utf-16-le')) // 2
ops = []
for tag, i1, i2, j1, j2 in SequenceMatcher(None, ol, nl, autojunk=False).get_opcodes():
    if tag != 'equal':
        ops.append([u16(''.join(ol[:i1])), u16(''.join(ol[:i2])), ''.join(nl[j1:j2])])
sys.stderr.write('%d ops, %d chars\n' % (len(ops), sum(len(o[2]) for o in ops)))
print(json.dumps(ops, ensure_ascii=False))
