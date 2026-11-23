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
# Paths no suite reads: the docs fast path does not cover them (they are not .md or under design/). e2e-m0 still runs.
INERT=('spikes/','.agents/','.claude/','.codex/','.pi/','.github/ISSUE_TEMPLATE/','.github/pull_request_template.md',
       'AGENTS.md','CLAUDE.md','README.md','skills-lock.json','.mcp.json')
def is_docs(f): return f.startswith('design/') or (f.endswith('.md') and not f.startswith(('packages/','e2e/','examples/')))
def inert(files): return all(is_docs(f) or f.startswith(INERT) for f in files) and any(not is_docs(f) for f in files)
area=lambda f: '/'.join(f.split('/')[:2])
KEEP=('e2e-m0','e2e-portal-next')
branches=set(); honest=inertmin=ceiling=0.0; matched=0; pr_e2e=0.0
rows=[]; seen=set()
for base in ['main','goal_stage-1']:
    for pr in json.load(open(f'prs-{base}.json')):
        n=str(pr['number']); br=pr['headRefName']
        if n in seen or br not in mins: continue
        seen.add(n); matched+=1
        files=[f['path'] for f in pr['files']]
        m=mins[br]; e=sum(m.values())
        first = br not in branches          # two pull requests can share a branch: count its minutes once
        branches.add(br)
        if not first: continue
        pr_e2e+=e
        if all(is_docs(f) for f in files) and files: continue   # already skipped by the docs fast path
        ceiling+=sum(v for s_,v in m.items() if s_ not in ('e2e-m1',)+KEEP)
        if len(files)>=100: continue                              # `files` is truncated at 100: run everything
        if inert(files):
            inertmin+=sum(v for s_,v in m.items() if s_ not in KEEP)
            continue
        need=needed(files)
        if need is not None:
            h=sum(v for s_,v in m.items() if s_ not in need and s_ not in KEEP)
            honest+=h
            if h>=5: rows.append((n,pr['baseRefName'],len(files),sorted(need),round(h),round(e)))
print("merged PRs with runs in the window:",matched,"on",len(branches),"branches")
print(f"e2e minutes: all runs {alle2e:.0f}; on those branches' pull-request runs {pr_e2e:.0f}")
pct=lambda x:f"{x:.0f} min = {100*x/alle2e:.1f}% of all e2e minutes, {100*x/pr_e2e:.1f}% of those branches'"
print("1 honest table (a change under e2e/<suite>/ runs that suite):     ",pct(honest))
print("2 inert paths (spikes/, .agents/, .claude/, ... skip all but m0):  ",pct(inertmin))
print("  1+2:                                                              ",pct(honest+inertmin))
print("3 ceiling (every non-docs PR skips everything but e2e-m1, which no table could justify):",pct(ceiling))
for r in rows: print(r)
print({k:round(v) for k,v in per_suite.items()})
