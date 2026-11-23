import csv,sys,collections as C
from datetime import datetime as T
D=sys.argv[1]
p=lambda s: T.fromisoformat(s.replace('Z','+00:00')) if s and s!='null' else None
runs={}
for r in csv.reader(open(D+'/ci.tsv'),delimiter='\t'):
    r+=['']*(11-len(r)); runs[r[0]]=dict(event=r[1],branch=r[2],concl=r[4],created=p(r[5]),start=p(r[6]),upd=p(r[7]),prs=r[9],base=r[10])
jobs=[]
for j in csv.reader(open(D+'/jobs.tsv'),delimiter='\t'):
    j+=['']*(8-len(j)); jobs.append(dict(run=j[0],name=j[1],concl=j[3],created=p(j[4]),start=p(j[5]),done=p(j[6]),runner=j[7]))
real=[j for j in jobs if j['runner'] and j['start'] and j['done'] and j['done']>j['start']]
m=lambda j:(j['done']-j['start']).total_seconds()/60
print("jobs that got a runner:",len(real),"minutes",round(sum(map(m,real))))
ev=[]
for j in real: ev+=[(j['start'],1),(j['done'],-1)]
ev.sort();c=0;pk=0;cap=0;last=None
for t,d in ev:
    if last and c>=20: cap+=(t-last).total_seconds()/60
    c+=d;pk=max(pk,c);last=t
print("true peak concurrent jobs",pk,"| minutes at >=20 running:",round(cap))
INT={'main','goal/stage-1','m1'}
cat=C.defaultdict(float);cn=C.Counter()
for j in real:
    r=runs[j['run']]
    if r['event']=='push': k='push to integration branch' if (r['branch'] in INT or r['branch'].startswith('goal/')) else 'push to a work branch'
    else: k='pull request'
    cat[k]+=m(j);cn[k]+=1
tot=sum(cat.values())
for k,v in cat.items(): print(f"  {k:28} {v:6.0f} min ({100*v/tot:.0f}%)")
rc=C.Counter()
for r in runs.values():
    if r['event']=='push': rc['push:'+('integration' if (r['branch'] in INT or r['branch'].startswith('goal/')) else 'work')+':'+r['concl']]+=1
    else: rc['pr:'+r['concl']]+=1
print(dict(rc))
# wall time per completed run
w=sorted((r['upd']-r['start']).total_seconds()/60 for r in runs.values() if r['concl'] in('success','failure') and r['start'] and r['upd'])
print(f"wall clock per finished run: median {w[len(w)//2]:.0f} min, p90 {w[int(.9*len(w))]:.0f}, max {w[-1]:.0f}")
# per run job-minutes for a full run
pr=C.defaultdict(float)
for j in real: pr[j['run']]+=m(j)
full=sorted(v for k,v in pr.items() if runs[k]['concl']=='success')
print(f"job-minutes per successful run: median {full[len(full)//2]:.0f}, p90 {full[int(.9*len(full))]:.0f}")
print("jobs per successful run median", sorted(C.Counter(j['run'] for j in real if runs[j['run']]['concl']=='success').values())[len(full)//2])
