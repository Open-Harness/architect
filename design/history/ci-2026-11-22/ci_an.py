import csv,sys,collections as C
from datetime import datetime as T
D=sys.argv[1]
p=lambda s: T.fromisoformat(s.replace('Z','+00:00')) if s and s!='null' else None
runs={}
for r in csv.reader(open(D+'/ci.tsv'),delimiter='\t'):
    r+=['']*(11-len(r)); runs[r[0]]=dict(event=r[1],branch=r[2],concl=r[4],created=p(r[5]),start=p(r[6]),upd=p(r[7]),prs=r[9],base=r[10])
jobs=[]
for j in csv.reader(open(D+'/jobs.tsv'),delimiter='\t'):
    j+=['']*(8-len(j))
    jobs.append(dict(run=j[0],name=j[1],concl=j[3],created=p(j[4]),start=p(j[5]),done=p(j[6]),runner=j[7]))
# Runner time only: a job that never got a runner used no capacity.
def mins(j): return (j['done']-j['start']).total_seconds()/60 if j['runner'] and j['start'] and j['done'] and j['done']>j['start'] else 0
tot=sum(mins(j) for j in jobs)
print(f"jobs {len(jobs)}  job-minutes {tot:.0f}  ({tot/48:.0f}/hour avg over 48h)")
by=C.defaultdict(float);cnt=C.Counter()
for j in jobs: by[j['concl']]+=mins(j);cnt[j['concl']]+=1
print("by job outcome:",{k:f"{cnt[k]} jobs / {v:.0f} min ({100*v/tot:.0f}%)" for k,v in sorted(by.items(),key=lambda x:-x[1])})
# by run outcome
br=C.defaultdict(float)
for j in jobs: br[runs.get(j['run'],{}).get('concl','?')]+=mins(j)
print("job-minutes by RUN outcome:",{k:f"{v:.0f} ({100*v/tot:.0f}%)" for k,v in sorted(br.items(),key=lambda x:-x[1])})
# by job name
bn=C.defaultdict(float);nn=C.Counter();med=C.defaultdict(list)
for j in jobs:
    m=mins(j); 
    if m>0: bn[j['name']]+=m;nn[j['name']]+=1;med[j['name']].append(m)
print("\nheaviest jobs (name: total min, runs, median min):")
for k,v in sorted(bn.items(),key=lambda x:-x[1])[:14]:
    l=sorted(med[k]);print(f"  {k[:40]:40} {v:6.0f}  {nn[k]:4}  {l[len(l)//2]:5.1f}")
# queue time
q=[(j['start']-j['created']).total_seconds()/60 for j in jobs if j['start'] and j['created'] and j['start']>=j['created']]
q.sort();print(f"\nqueue wait per job: median {q[len(q)//2]:.1f} min, p90 {q[int(len(q)*.9)]:.1f}, max {q[-1]:.0f}")
# by hour: queue p90 and concurrency
H=C.defaultdict(list)
for j in jobs:
    if j['start'] and j['created']: H[j['created'].strftime('%d %H')].append((j['start']-j['created']).total_seconds()/60)
# concurrency
ev=[]
for j in jobs:
    if j['start'] and j['done'] and j['done']>j['start']: ev+=[(j['start'],1),(j['done'],-1)]
ev.sort();c=0;peak=C.defaultdict(int);atcap=C.defaultdict(float);last=None
for t,d in ev:
    if last and c>=20: atcap[last.strftime('%d %H')]+=(t-last).total_seconds()/60
    c+=d;k=t.strftime('%d %H');peak[k]=max(peak[k],c);last=t
print("\nhour(UTC) jobs-started  queue-median  queue-max  peak-concurrent  minutes-at-20-cap")
for k in sorted(H):
    l=sorted(H[k]);print(f"  {k}  {len(l):4}  {l[len(l)//2]:6.1f}  {l[-1]:6.0f}  {peak.get(k,0):4}  {atcap.get(k,0):5.0f}")
# runs per PR, cancels
prc=C.Counter();prcanc=C.Counter()
for r in runs.values():
    for n in r['prs'].split():
        prc[n]+=1
        if r['concl']=='cancelled': prcanc[n]+=1
print("\nPRs with CI:",len(prc)," runs per PR median",sorted(prc.values())[len(prc)//2],"max",max(prc.values()))
print("most-run PRs:",[(n,prc[n],prcanc[n]) for n,_ in prc.most_common(10)])
pb=C.Counter(r['base'] or ('push:'+r['branch']) for r in runs.values() if r['concl']!='skipped')
print("runs by base/branch:",pb.most_common(12))
