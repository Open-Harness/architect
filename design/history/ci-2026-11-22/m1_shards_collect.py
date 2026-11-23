"""Refresh m1-shards.json.gz from GitHub (design/decisions/CI-m1-shards.md): the step timings of the four green e2e-m1-shard jobs
of the latest N `ci` runs, and the per-file test times from their m1-report artifacts (kept three days, so run this soon after).
    python3 m1_shards_collect.py [N=20] [--branch-not-containing probe]      needs `gh`, logged in
Writes m1-shards.json.gz beside this file; then `python3 m1_shards_replay.py` prints the figures."""
import gzip, io, json, os, re, subprocess, sys, zipfile
D = os.path.dirname(os.path.abspath(__file__)); REPO = "Open-Harness/orthograph"
n = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 20
gh = lambda *a, raw=False: subprocess.run(["gh", "api", *a], capture_output=True, check=True).stdout if raw else json.loads(subprocess.run(["gh", "api", *a], capture_output=True, text=True, check=True).stdout)
runs = gh(f"repos/{REPO}/actions/workflows/ci.yml/runs?per_page=100&status=completed")["workflow_runs"]
out = {"taken": subprocess.run(["date", "-u", "+%F"], capture_output=True, text=True).stdout.strip(), "steps": [], "files": {}}
for r in runs:
    if len(out["steps"]) >= n: break
    if "probe" in r["head_branch"]: continue
    jobs = [j for j in gh(f"repos/{REPO}/actions/runs/{r['id']}/jobs?per_page=100")["jobs"] if j["name"].startswith("e2e-m1-shard") and j["conclusion"] == "success"]
    if len(jobs) != 4: continue
    out["steps"].append({"run": str(r["id"]), "branch": r["head_branch"], "at": r["created_at"], "jobs": [
        {"name": j["name"], "started": j["started_at"], "completed": j["completed_at"], "steps": [[s["name"], s["started_at"], s["completed_at"]] for s in j["steps"]]} for j in jobs]})
    arts = [a for a in gh(f"repos/{REPO}/actions/runs/{r['id']}/artifacts")["artifacts"] if a["name"].startswith("m1-report") and not a["expired"]]
    for a in arts:
        z = zipfile.ZipFile(io.BytesIO(gh(f"repos/{REPO}/actions/artifacts/{a['id']}/zip", raw=True)))
        rep = json.loads(z.read("m1-report.json"))
        out["files"].setdefault(str(r["id"]), {})[a["name"][-1]] = {re.sub(r".*/e2e/", "e2e/", t["name"]): round((t["endTime"] - t["startTime"]) / 1000, 1) for t in rep["testResults"]}
gzip.open(D + "/m1-shards.json.gz", "wt").write(json.dumps(out, separators=(",", ":")))
print(len(out["steps"]), "runs;", len(out["files"]), "with per-file times")
