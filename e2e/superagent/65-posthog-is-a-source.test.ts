// Check 65 (Goal 17 slice 10): PostHog becomes an active source once it has events. Slice 5's check 14 left it out because its
// adapter had no events (GOAL17-names call 6); slice 11 writes `errorAlert` and `errorResolved` by hand, the app's mount
// includes them, and `posthogSource` (plugins/intake/blueprint/sources/posthog.ts) maps them. Then PostHog is in the model's
// `sources` like GitHub and Slack are, a mount that leaves out an event the source maps is refused, and a source with none of
// its events included is silent (GOAL17-source-from :54).
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { build, copyApp, edit, lazy, removeCopies, run, check } from "./app.ts";

describe("65 posthog is an active source", () => {
  const built = lazy(build);
  afterAll(removeCopies);
  const source = () => built().model["sources"]?.["posthog"];

  it("the app's mount includes PostHog's two alert events beside its three calls", () => {
    expect([...(built().model["mounts"]?.["posthog"]?.events ?? [])].sort()).toEqual(["errorAlert", "errorResolved"]);
    expect([...(built().model["mounts"]?.["posthog"]?.calls ?? [])].sort()).toEqual(["errorTrackingIssuesList", "errorTrackingIssuesPartialUpdate", "errorTrackingIssuesRetrieve"]);
  });

  it("`sources.posthog` is in the model: its mount, the events it maps, the calls it reads, its variables and the kind it makes", () => {
    expect(source(), "sources.posthog").toMatchObject({ mount: "posthog" });
    expect([...(source()?.events ?? [])].sort()).toEqual(["errorAlert", "errorResolved"]);
    expect(source()?.calls).toEqual(expect.arrayContaining(["errorTrackingIssuesRetrieve"]));
    expect(Object.keys(source()?.variables ?? {}).sort()).toEqual(["POSTHOG_ISSUE", "POSTHOG_PROJECT"]);
    expect([...(source()?.kinds ?? [])].sort()).toEqual(["errorIssue"]);
  });

  it("GitHub and Slack are still sources, and PostHog's variables are named from PostHog, never as a secret", () => {
    expect(Object.keys(built().model["sources"] ?? {})).toEqual(expect.arrayContaining(["github", "slack", "posthog", "timer"]));
    for (const v of Object.keys(source()?.variables ?? {})) {
      expect(v).toMatch(/^POSTHOG_[A-Z0-9_]+$/);
      expect(v).not.toMatch(/_(TOKEN|KEY|SECRET|PASSWORD)$/);
    }
  });

  it("the three adapters each give one door's worth of events, and no two sources share an event name from different mounts", () => {
    const events = Object.entries<any>(built().model["sources"] ?? {}).filter(([n]) => n !== "timer").map(([n, s]) => [n, [...(s.events ?? [])]] as const);
    expect(events.map(([n]) => n).sort()).toEqual(["github", "posthog", "slack"]);
    for (const [n, e] of events) expect(new Set(e).size, `${n}: an event listed twice`).toBe(e.length);
  });
});

describe("65 posthog: what a mount that leaves events out does", () => {
  afterEach(removeCopies);
  const verdict = (root: string) => { const g = run(root, ["generate"]); const c = check(root); return { passes: g.status === 0 && c.status === 0, out: `${g.out}\n${c.out}` }; };

  it("a mount that leaves out the event its source closes on (`errorResolved`) is refused, naming the mount's file, the event, the source and the line to add", () => {
    const root = copyApp();
    edit(root, "blueprint/adapters/posthog.ts", (t) => t.replace(/^.*\.include\(\w+\.events\.errorResolved\).*\n/m, ""));
    const v = verdict(root);
    expect(v.passes, v.out).toBe(false);
    for (const m of ["blueprint/adapters/posthog.ts", "does not include", "events.errorResolved", "posthogSource"]) expect(v.out, m).toContain(m);
    expect(v.out).toMatch(/\.include\(\w+\.events\.errorResolved\)/);
  });

  it("a mount that includes none of its events leaves PostHog silent: not in `sources`, and nothing refused", () => {
    const root = copyApp();
    edit(root, "blueprint/adapters/posthog.ts", (t) => t.replace(/^.*\.include\(\w+\.events\.\w+\).*\n/gm, ""));
    const v = verdict(root);
    expect(v.passes, v.out).toBe(true);
    const model = JSON.parse(run(root, ["model", "--json"]).stdout) as { sources?: Record<string, unknown> };
    expect(Object.keys(model.sources ?? {})).not.toContain("posthog");
  });
});
