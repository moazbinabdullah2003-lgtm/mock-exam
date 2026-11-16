#!/usr/bin/env python3
"""Restore live data from a backup folder. DRY RUN by default; add --yes to really write to the live backend.
Usage: python3 tools/restore.py backups/<stamp> [--only settings,roster,exams,attempts] [--yes]
Writes through the normal teacher API (savecfg / saveroster / upload / doPost), so the /exec URL and code are untouched.
Attempts are de-duplicated by aid on the server, so restoring them twice is safe."""
import json, os, sys, re, time, urllib.request, urllib.parse, glob
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = re.search(r'SCRIPT_URL:\s*"([^"]+)"', open(os.path.join(R, 'src/js/01-config.js'), encoding='utf-8').read()).group(1)
KEY = os.environ.get('TEACHER_KEY') or open(os.path.join(R, '.local/teacher_key')).read().strip()
args = [a for a in sys.argv[1:] if not a.startswith('--')]
if not args: sys.exit(__doc__)
B = args[0]; YES = '--yes' in sys.argv
only = (sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else ['settings', 'roster', 'exams', 'attempts'])
rj = lambda n: json.load(open(os.path.join(B, n), encoding='utf-8'))

def post(d):
    if not YES: return 'dry-run'
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(URL, urllib.parse.urlencode(d).encode()), timeout=60) as r: return r.read(200).decode('utf-8', 'ignore')[:40]
        except Exception as e: err = e; time.sleep(2)
    return 'ERR ' + str(err)

if 'settings' in only:
    print('settings   ', post({'action': 'savecfg', 'key': KEY, 'cfg': json.dumps(rj('settings.json')['cfg'], ensure_ascii=False)}))
if 'roster' in only:
    r = rj('roster.json'); print('roster     ', len(r), 'students', post({'action': 'saveroster', 'key': KEY, 'roster': json.dumps(r, ensure_ascii=False)}))
if 'exams' in only:
    for f in sorted(glob.glob(os.path.join(B, 'exams', '*.json'))):
        e = json.load(open(f, encoding='utf-8')); c = e['code']; rows = []
        for i, q in enumerate(e['questions']):
            o = (q['o'] + [''] * 5)[:5]
            rows.append([c, e['title'] if i == 0 else '', str(e['minutes']) if i == 0 else '', str(e['neg']) if i == 0 else '', ('YES' if e.get('open', True) else 'NO') if i == 0 else '',
                         q['q'], *o, 'ABCDE'[q['a']] if 0 <= q['a'] < 5 else '', q.get('t', ''), q.get('e', '')])
        print('exam', c, len(rows), 'questions', post({'action': 'upload', 'key': KEY, 'code': c, 'rows': json.dumps(rows, ensure_ascii=False)}))
if 'attempts' in only:
    a = rj('attempts.json'); res = [post({k: (v if k != 'details' else v) for k, v in x.items()}) for x in a]
    print('attempts   ', len(a), 'rows', set(res))
print('' if YES else '\n(dry run — nothing was written. Re-run with --yes to restore.)')
