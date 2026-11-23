"""Build design/evidence/index.html from captured runs, retaining unverified legacy records."""
import glob, html, json, os, re

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
EV = os.path.join(ROOT, "design", "evidence")
REPO = "https://github.com/Open-Harness/orthograph"
META = re.compile(r"# commit ([0-9a-f]{7,40}) · (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) · exit (\d+) \(expected (\d+)\) · (\d+(?:\.\d+)?s)")


def shown(text):
    """Redact known private display forms; source captures remain untouched."""
    text = re.sub(r"(?:/(?:Users|home)/|(?:/private)?/(?:tmp|var/folders)/|~/)[^\s<>\"']*", "<local path>", text)
    text = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "<email>", text)
    text = re.sub(r"\b(?:sk-|phx_|phc_)[A-Za-z0-9_-]{12,}", "<redacted token>", text)
    text = re.sub(r"(?i)(authorization[\"']?\s*[:=]\s*[\"']?bearer\s+)\S+", r"\1<redacted token>", text)
    text = re.sub(r"\borg_[a-z0-9]{6,}\b", "<organization id>", text)
    return html.escape(text)


def capture(path):
    raw = open(path).read()
    lines = raw.split("\n")
    match = META.fullmatch(lines[1]) if len(lines) > 2 and lines[2] == "" else None
    if match is None or not lines[0].startswith("$ ") or not lines[0][2:].strip():
        return dict(verified=False, body=raw.strip())
    commit, when, code, expect, took = match.groups()
    return dict(verified=True, cmd=lines[0][2:], commit=commit, when=when,
                code=code, expect=expect, took=took, body="\n".join(lines[3:]).strip())


def run_html(name, cap, caption):
    if not cap["verified"]:
        return f"""
<details class="run">
  <summary><span class="chip unknown">unverified</span><span class="cap">{shown(caption)}</span>
    <span class="meta">capture metadata unavailable</span></summary>
  <div class="term"><pre>{shown(cap['body'])}</pre></div>
</details>"""
    ok = cap["code"] == cap["expect"]
    planted = cap["expect"] != "0"
    badge = ("caught" if planted else "passed") if ok else "unexpected"
    cls = ("planted" if planted else "pass") if ok else "bad"
    return f"""
<details class="run" {'open' if planted else ''}>
  <summary>
    <span class="chip {cls}">{badge}</span>
    <span class="cap">{shown(caption)}</span>
    <span class="meta">exit {cap['code']} · {cap['took']} · {cap['when']}</span>
  </summary>
  <div class="term"><div class="prompt">$ {shown(cap['cmd'])}</div><pre>{shown(cap['body'])}</pre></div>
</details>"""


def step_html(d):
    s = json.load(open(os.path.join(d, "step.json")))
    caps = sorted(glob.glob(os.path.join(d, "*.txt")))
    runs = [(os.path.basename(p)[:-4], capture(p)) for p in caps]
    ci = json.load(open(os.path.join(d, "ci.json")))[0] if os.path.exists(os.path.join(d, "ci.json")) else None
    verified = [c for _, c in runs if c["verified"]]
    all_ok = bool(runs) and len(verified) == len(runs) and all(c["code"] == c["expect"] for c in verified) and (ci is None or ci["conclusion"] == "success")
    unverified = not runs or len(verified) != len(runs)
    failed = any(c["code"] != c["expect"] for c in verified) or (ci is not None and ci["conclusion"] in {"failure", "timed_out", "cancelled", "startup_failure", "action_required"})
    status = "not done" if failed else "done" if all_ok else "unverified" if unverified else "not done"
    cls = "bad" if failed else "pass" if all_ok else "unknown" if unverified else "bad"
    ci_html = f'<a href="{html.escape(ci["url"], quote=True)}">CI {shown(ci["conclusion"])}</a>' if ci else "CI not run"
    commits = list(dict.fromkeys(c["commit"] for c in verified))
    commit_html = " · ".join(f'<a href="{REPO}/commit/{commit}">commit {commit}</a>' for commit in commits) or "commit metadata unavailable"
    body = "".join(run_html(n, c, s["captions"].get(n, n)) for n, c in runs)
    return f"""
<section class="step">
  <div class="stage">{shown(s['stage'])}</div>
  <h2><span class="id">{shown(s['step'])}</span> {shown(s['title'])} <span class="chip {cls}">{status}</span></h2>
  <p class="summary">{shown(s['summary'])}</p>
  <div class="proves"><span class="label">Done when</span>{shown(s['proves'])}</div>
  <div class="links">{ci_html} · {commit_html} · {len(verified)} verified captures · {len(runs) - len(verified)} unverified records</div>
  {body}
</section>"""


steps = sorted([d for d in glob.glob(os.path.join(EV, "*")) if os.path.isdir(d)], reverse=True)
page = open(os.path.join(os.path.dirname(__file__), "template.html")).read().replace("<!--STEPS-->", "".join(step_html(d) for d in steps))
open(os.path.join(EV, "index.html"), "w").write(page)
print("wrote design/evidence/index.html with", len(steps), "steps")
