#!/usr/bin/env python3
"""Full backup of the live quiz system into backups/<timestamp>/ (stays on this Mac, never pushed to GitHub).
Usage: python3 tools/backup.py [--keep 30]
Contains: settings, roster (student passwords!), every exam with all questions, all attempts (JSON+CSV),
Code.gs copy, a tar.gz of the whole project folder, manifest.json with counts + hashes.
Teacher key: env TEACHER_KEY or .local/teacher_key."""
import json, os, sys, time, urllib.request, urllib.parse, hashlib, subprocess, tarfile, csv, shutil, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = re.search(r'SCRIPT_URL:\s*"([^"]+)"', open(os.path.join(R, 'src/js/01-config.js'), encoding='utf-8').read()).group(1)
PAGE = 'https://moazbinabdullah2003-lgtm.github.io/mock-exam/quiz.html'
KEY = os.environ.get('TEACHER_KEY') or open(os.path.join(R, '.local/teacher_key')).read().strip()

def get(params, tries=6):
    q = urllib.parse.urlencode(params)
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(URL + '?' + q + '&t=' + str(int(time.time() * 1000)), timeout=40) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:           # Google sometimes answers with an HTML error page: just retry
            last = e; time.sleep(2 + i)
    sys.exit('FAILED to read ' + str(params.get('action')) + ': ' + str(last))

def sha(b): return hashlib.sha256(b).hexdigest()

def main():
    keep = int(sys.argv[sys.argv.index('--keep') + 1]) if '--keep' in sys.argv else 30
    if not get({'action': 'tlogin', 'key': KEY}).get('ok'):
        sys.exit('Teacher key rejected. Put the current teacher password in .local/teacher_key')
    stamp = time.strftime('%Y-%m-%d_%H%M%S')
    out = os.path.join(R, 'backups', stamp); os.makedirs(os.path.join(out, 'exams'))
    wj = lambda name, obj: open(os.path.join(out, name), 'w', encoding='utf-8').write(json.dumps(obj, ensure_ascii=False, indent=1))

    cfg = get({'action': 'settings'}); wj('settings.json', cfg)
    roster = get({'action': 'roster', 'key': KEY}); wj('roster.json', roster)
    exl = get({'action': 'exams', 'key': KEY}); wj('exams_list.json', exl)
    nq = 0
    for e in exl:
        ex = get({'action': 'exam', 'code': e['code']})
        if 'questions' not in ex: sys.exit('exam ' + e['code'] + ' unreadable')
        nq += len(ex['questions']); wj('exams/' + e['code'] + '.json', dict(ex, code=e['code']))
    att = get({'action': '', 'key': KEY}); wj('attempts.json', att)
    with open(os.path.join(out, 'attempts.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f); w.writerow(['sid', 'name', 'exam', 'aid', 'mode', 'score', 'total', 'secs', 'details'])
        for a in att: w.writerow([a.get(k, '') for k in ['sid', 'name', 'exam', 'aid', 'mode', 'score', 'total', 'secs', 'details']])
    code = open(os.path.join(R, 'backend/Code.gs'), 'rb').read()
    shutil.copy(os.path.join(R, 'backend/Code.gs'), os.path.join(out, 'Code.gs'))

    # whole project folder (source, docs, tests, tools) so the Mac alone can rebuild everything
    with tarfile.open(os.path.join(out, 'project-source.tar.gz'), 'w:gz') as t:
        t.add(R, arcname='quiz-server', filter=lambda ti: None if re.search(r'/(backups|\.local|\.git|node_modules)(/|$)|\.DS_Store', '/' + ti.name) else ti)

    try: live = sha(urllib.request.urlopen(PAGE + '?x=' + stamp, timeout=40).read())
    except Exception: live = 'unreachable'
    try: commit = subprocess.check_output(['git', '-C', R, 'rev-parse', 'HEAD']).decode().strip()
    except Exception: commit = ''
    man = {'time': stamp, 'counts': {'exams': len(exl), 'questions': nq, 'students': len(roster), 'attempts': len(att)},
           'settings_keys': sorted((cfg.get('cfg') or {}).keys()), 'code_gs_sha256': sha(code),
           'dist_quiz_html_sha256': sha(open(os.path.join(R, 'dist/quiz.html'), 'rb').read()), 'live_quiz_html_sha256': live, 'git_commit': commit}
    wj('manifest.json', man)
    old = sorted(d for d in os.listdir(os.path.join(R, 'backups')) if re.match(r'\d{4}-\d\d-\d\d_\d{6}$', d))
    for d in old[:-keep]: shutil.rmtree(os.path.join(R, 'backups', d))
    print('BACKUP OK ->', out); print(json.dumps(man['counts']))

main()
