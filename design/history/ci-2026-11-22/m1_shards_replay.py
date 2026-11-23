"""Where the e2e-m1 shards' minutes go (design/decisions/CI-m1-shards.md). Reads m1-shards.json.gz next to it:
the step timings of the four green shards of 19 recent `ci` runs on goal/stage-1 (jobs API), and the per-file test times
of eight of them (the m1-report artifacts). Prints the step table, the shard imbalance and the rebalancing replay."""
import collections as C, gzip, json, os, statistics as S
from datetime import datetime as T
D = os.path.dirname(os.path.abspath(__file__))
data = json.load(gzip.open(D + "/m1-shards.json.gz", "rt"))
p = lambda s: T.fromisoformat(s.replace("Z", "+00:00"))
mins = lambda a, b: (p(b) - p(a)).total_seconds() / 60
step = C.defaultdict(list); jobs = []; spread = []
for r in data["steps"]:
    ts = []
    for j in r["jobs"]:
        t = mins(j["started"], j["completed"]); ts.append(t); jobs.append(t)
        for n, a, b in j["steps"]:
            if a and b: step[n].append(mins(a, b))
    spread.append((max(ts), min(ts)))
total = sum(jobs)
print(f"{len(data['steps'])} runs, {len(jobs)} shard jobs, {total:.0f} job-minutes, median job {S.median(jobs):.1f} min")
for s, k, m in sorted(((sum(v), k, S.median(v)) for k, v in step.items()), reverse=True)[:10]:
    print(f"  {s:6.1f} min {100*s/total:5.1f}%  median {m:5.2f}  {k[:60]}")
print(f"slowest vs fastest shard of a run, median: {S.median(a for a, b in spread):.1f} vs {S.median(b for a, b in spread):.1f} min")
runs = {r: s for r, s in data["files"].items() if len(s) == 4}
cur = [[sum(s[str(i)].values()) / 60 for i in (1, 2, 3, 4)] for s in runs.values()]
cm = S.median(max(c) for c in cur)
print(f"{len(runs)} runs with per-file times; slowest shard's test time, median {cm:.1f} min; the four, ranked: {[round(S.median(sorted(c)[i] for c in cur), 1) for i in range(4)]}")
res = []
for r in runs:                       # assign by the OTHER runs' medians, judge on this run's real times
    train = C.defaultdict(list)
    for r2, s in runs.items():
        if r2 != r:
            for fs in s.values():
                for f, t in fs.items(): train[f].append(t)
    m = {f: S.median(v) for f, v in train.items()}; dflt = S.median(m.values())
    actual = {f: t for fs in runs[r].values() for f, t in fs.items()}
    load = [0.0] * 4; real = [0.0] * 4
    for f in sorted(actual, key=lambda f: -m.get(f, dflt)):
        i = load.index(min(load)); load[i] += m.get(f, dflt); real[i] += actual[f]
    res.append(max(real) / 60)
files = C.defaultdict(list)
for s in runs.values():
    for fs in s.values():
        for f, t in fs.items(): files[f].append(t)
med = {f: S.median(v) for f, v in files.items()}
print(f"rebalanced by out-of-sample per-file medians: slowest shard median {S.median(res):.1f} min (ideal {sum(med.values())/4/60:.1f}); {len(med)} files, {sum(med.values())/60:.1f} min of test time")
for f, t in sorted(med.items(), key=lambda x: -x[1])[:5]: print(f"  {t/60:4.1f} min  {f}")
