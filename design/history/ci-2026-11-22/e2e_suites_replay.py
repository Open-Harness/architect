import csv,json,re,collections as C
from datetime import datetime as T
p=lambda s: T.fromisoformat(s.replace('Z','+00:00')) if s and s!='null' else None
runs={}
for r in csv.reader(open('ci.tsv'),delimiter='\t'):
    r+=['']*(11-len(r)); runs[r[0]]=dict(event=r[1],branch=r[2],prs=r[9],base=r[10])
def suite(name):
    ids=re.findall(r"e2e-[a-z0-9-]+",name)
    if not ids: return None
    s=ids[-1]
    return 'e2e-m1' if s=='e2e-m1-shard' else s
mins=C.defaultdict(lambda: C.defaultdict(float))   # pr -> suite -> minutes
alle2e=0; per_suite=C.defaultdict(float)
for j in csv.reader(open('jobs.tsv'),delimiter='\t'):
    j+=['']*(8-len(j)); run,name,concl,st,dn,runner=j[0],j[1],j[3],p(j[5]),p(j[6]),j[7]
    s=suite(name)
    if not s or not runner or not st or not dn or dn<=st: continue
    m=(dn-st).total_seconds()/60
    # the m1 aggregate and its shards are one suite
    alle2e+=m; per_suite[s]+=m
    r=runs.get(run)
    if r and r['event']=='pull_request': mins[r['branch']][s]+=m
SUITES={'layer1':'e2e-layer1','layer2':'e2e-layer2','m1':'e2e-m1','m2':'e2e-m2','m8':'e2e-m8','climb':'e2e-climb','grid':'e2e-grid','stage1':'e2e-stage1'}
SHARED=re.compile(r'^e2e/(fixtures|ratchet|totals|ports\.ts|vitest|project\.json|package\.json|tsconfig|[^/]+$)')
def needed(files):
    """suites that must run for these changed files; None = all"""
    need=set()
    for f in files:
        if f.startswith('design/') or f.endswith('.md') and not f.startswith(('packages/','e2e/','examples/')): continue  # docs-only path
        m=re.match(r'^e2e/([^/]+)/',f)
        if m and m.group(1) in SUITES and not f.startswith('e2e/fixtures/'):
            need.add(SUITES[m.group(1)]); continue
        return None
    return need
tot_skip=0; tot_pr_e2e=0; rows=[]
seen=set()
for base in ['main','goal_stage-1']:
    for pr in json.load(open(f'prs-{base}.json')):
        n=str(pr['number']); br=pr['headRefName']
        if n in seen or br not in mins: continue
        seen.add(n)
        files=[f['path'] for f in pr['files']]
        m=mins[br]; e=sum(m.values()); tot_pr_e2e+=e
        if len(files)>=100: need=None
        else: need=needed(files)
        skipped=0
        if need is not None:
            skipped=sum(v for s,v in m.items() if s not in need and s not in ('e2e-m0','e2e-portal-next'))
            if not files or all(x.startswith('design/') for x in files): skipped=0
        tot_skip+=skipped
        if skipped: rows.append((n,pr['baseRefName'],len(files),sorted(need),round(skipped),round(e)))
print("PRs with runs in the window:",len(seen))
print(f"e2e minutes, all runs in window: {alle2e:.0f}; on those PRs' runs: {tot_pr_e2e:.0f}")
print(f"skippable by a per-suite table (conservative rules): {tot_skip:.0f} min = {100*tot_skip/alle2e:.1f}% of all e2e minutes, {100*tot_skip/tot_pr_e2e:.1f}% of those PRs'")
for r in rows: print(r)
print({k:round(v) for k,v in per_suite.items()})

# Optimistic bound: a PR whose files sit in ONE area (packages/<x>, examples/<x> or e2e/<suite>) would skip every suite but e2e-m1,
# and an e2e/<suite>-only PR skips all but its own. No table could do better without knowing real reads.
area=lambda f: '/'.join(f.split('/')[:2])
bound=0; n1=0
seen2=set()
for base in ['main','goal_stage-1']:
    for pr in json.load(open(f'prs-{base}.json')):
        n=str(pr['number']); br=pr['headRefName']
        if n in seen2 or br not in mins: continue
        seen2.add(n); files=[f['path'] for f in pr['files']]
        if len(files)>=100 or not files or all(x.startswith('design/') for x in files): continue
        if len({area(f) for f in files})==1 and not files[0].startswith(('tools/','.github/','e2e/fixtures')):
            n1+=1; m=mins[br]
            bound+=sum(v for s,v in m.items() if s not in ('e2e-m1','e2e-m0','e2e-portal-next'))
print(f"optimistic bound: {n1} single-area PRs, {bound:.0f} min = {100*bound/alle2e:.1f}% of all e2e minutes, {100*bound/tot_pr_e2e:.1f}% of those PRs'")
