// Check 65 (Goal 17 slice 10): PostHog becomes an active source once it has events. Slice 5's check 14 left it out because its
// adapter had no events (GOAL17-names call 6); slice 11 writes `errorAlert` and `errorResolved` by hand, the app's mount
// includes them, and `posthogSource` (plugins/intake/blueprint/sources/posthog.ts) maps them. Then PostHog is in the model's
// `sources` like GitHub and Slack are, exactly as it is declared; a mount that includes some of what it uses and not the rest is
// refused, each missing piece named; and a mount that includes none of its events leaves it silent (GOAL17-source-from :54).
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { build, check, copyApp, lazy, removeCopies, run, write } from "./app.ts";

describe("65 posthog is an active source", () => {
  const built = lazy(build);
  afterAll(removeCopies);
  const source = () => built().model["sources"]?.["posthog"];

  it("the app's mount includes exactly PostHog's two alert events beside its three calls", () => {
    expect([...(built().model["mounts"]?.["posthog"]?.events ?? [])].sort()).toEqual(["errorAlert", "errorResolved"]);
    expect([...(built().model["mounts"]?.["posthog"]?.calls ?? [])].sort()).toEqual(["errorTrackingIssuesList", "errorTrackingIssuesPartialUpdate", "errorTrackingIssuesRetrieve"]);
  });

  it("`sources.posthog` is in the model exactly: its mount, the two events it maps, the one call it reads, its two variables, and the one kind it makes", () => {
    const s = source();
    expect(s, "sources.posthog").toBeDefined();
    expect(s.mount).toBe("posthog");
    expect([...(s.events ?? [])].sort()).toEqual(["errorAlert", "errorResolved"]);
    expect([...(s.calls ?? [])].sort(), "history reads one issue back").toEqual(["errorTrackingIssuesRetrieve"]);
    expect(Object.keys(s.variables ?? {}).sort()).toEqual(["POSTHOG_ISSUE", "POSTHOG_PROJECT"]);
    for (const [name, text] of Object.entries<string>(s.variables ?? {})) expect(typeof text === "string" && text.length > 0, `${name} is described`).toBe(true);
    expect([...(s.kinds ?? [])], "kinds").toEqual(["errorIssue"]);
  });

  it("GitHub, Slack, PostHog and the timer are the sources, and PostHog's variables are named from PostHog, never as a secret", () => {
    expect(Object.keys(built().model["sources"] ?? {}).sort()).toEqual(["github", "posthog", "slack", "timer"]);
    for (const v of Object.keys(source()?.variables ?? {})) {
      expect(v).toMatch(/^POSTHOG_[A-Z0-9_]+$/);
      expect(v).not.toMatch(/_(TOKEN|KEY|SECRET|PASSWORD)$/);
    }
  });

  it("each source's events are exactly its mount's included events, and no event name is claimed by two sources", () => {
    const sources = Object.entries<any>(built().model["sources"] ?? {}).filter(([n]) => n !== "timer");
    for (const [name, s] of sources) {
      const mounted = [...(built().model["mounts"]?.[name]?.events ?? [])];
      expect([...(s.events ?? [])].every((e: string) => mounted.includes(e)), `${name}: a mapped event the mount does not include`).toBe(true);
      expect(new Set(s.events).size, `${name}: an event listed twice`).toBe((s.events ?? []).length);
    }
    const all = sources.flatMap(([, s]) => [...(s.events ?? [])] as Array<string>);
    expect(new Set(all).size, `an event name in two sources: ${all.join(", ")}`).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(8);
  });
});

describe("65 posthog: what a mount that includes some of it and not the rest does", () => {
  afterEach(removeCopies);
  const MOUNT = "blueprint/adapters/posthog.ts";
  const CALLS = ["errorTrackingIssuesList", "errorTrackingIssuesRetrieve", "errorTrackingIssuesPartialUpdate"];
  /** The app's PostHog mount, written to include exactly these calls and these events. */
  const mounted = (calls: ReadonlyArray<string>, events: ReadonlyArray<string>) => {
    const root = copyApp();
    write(root, MOUNT, `import { Blueprint } from "orthograph";\nimport posthog from "@orthograph/posthog";\n\nexport default Blueprint.use(posthog, (p) => [\n${[...calls.map((c) => `p.calls.${c}`), ...events.map((e) => `p.events.${e}`)].map((i) => `  p.include(${i}),`).join("\n")}\n]);\n`);
    return root;
  };
  const verdict = (root: string) => { const g = run(root, ["generate"]); const c = check(root); return { passes: g.status === 0 && c.status === 0, out: `${g.out}\n${c.out}` }; };
  const sourcesOf = (root: string) => (JSON.parse(run(root, ["model", "--json"]).stdout) as { sources?: Record<string, unknown> }).sources ?? {};
  /** The problem line: the mount's file, "does not include", the piece, the source, and the line to add. */
  const refusedFor = (root: string, piece: string) => {
    const v = verdict(root);
    expect(v.passes, v.out).toBe(false);
    expect(v.out, "a crash is not a refusal").not.toMatch(/^\s+at .*:\d+:\d+\)?$|\b(TypeError|ReferenceError|Unhandled|ENOENT)\b/m);
    const line = v.out.split("\n").find((l) => l.startsWith(MOUNT) && l.includes("does not include") && l.includes(piece));
    expect(line, `a problem line of ${MOUNT} that does not include ${piece}:\n${v.out}`).toBeDefined();
    expect(line).toContain("posthogSource");
    expect(line).toMatch(new RegExp(`\\.include\\(\\w+\\.${piece.replace(".", "\\.")}\\)`));
  };

  it("control: the mount with both events and the three calls passes, and PostHog is a source", () => {
    const root = mounted(CALLS, ["errorAlert", "errorResolved"]);
    const v = verdict(root);
    expect(v.passes, v.out).toBe(true);
    expect(Object.keys(sourcesOf(root))).toContain("posthog");
  });

  it("a mount that leaves out the event its source closes on (`errorResolved`) is refused, naming the mount's file, the event, the source and the line to add", () => {
    refusedFor(mounted(CALLS, ["errorAlert"]), "events.errorResolved");
  });

  it("a mount that leaves out the event its source opens on (`errorAlert`) is refused the same way", () => {
    refusedFor(mounted(CALLS, ["errorResolved"]), "events.errorAlert");
  });

  it("a mount that leaves out the call its history reads (`errorTrackingIssuesRetrieve`) is refused the same way", () => {
    refusedFor(mounted(["errorTrackingIssuesList", "errorTrackingIssuesPartialUpdate"], ["errorAlert", "errorResolved"]), "calls.errorTrackingIssuesRetrieve");
  });

  it("a mount that includes none of its events leaves PostHog silent: not in `sources`, and nothing refused, whatever calls it has", () => {
    for (const calls of [CALLS, []]) {
      const root = mounted(calls, []);
      const v = verdict(root);
      expect(v.passes, v.out).toBe(true);
      expect(Object.keys(sourcesOf(root)), `calls: ${calls.length}`).not.toContain("posthog");
    }
  });
});
