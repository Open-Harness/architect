// Check 02 (Goal 17 slice 3): a mount reaches only what it includes, and an include of a call or event the spec doesn't
// have fails `ortho check`, naming the mount's file and what is missing. Written the way the superagent's own mounts are
// (`blueprint/adapters/<name>.ts`, `Blueprint.use(plugin, (p) => [p.include(p.calls.issues.createComment), ...])`).
//
// Half runs on plugins generated from the pinned fixtures (every call GitHub, Slack and PostHog publish, and GitHub's
// events); half on the plugins the app holds in examples/superagent/plugins, for Slack's hand-written events.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NEEDS, appPlugin } from "./needs.ts";
import { NAMES, trimmed, type Name } from "./pins.ts";
import { build, install, newAdapter, project, removeProjects, run, type Node } from "./plugin.ts";
import { operations, readSpec, webhooks } from "./spec.ts";

afterEach(removeProjects);

const mountFile = (name: string) => `blueprint/adapters/${name}.ts`;
/** `blueprint/adapters/<name>.ts` as a developer writes it; each item is an expression on `p`, such as `p.calls.issues.get`. */
const mount = (root: string, name: string, items: ReadonlyArray<string>) => {
  const file = join(root, mountFile(name));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, [`import { Blueprint } from "orthograph";`, `import plugin from "@orthograph/${name}";`, "",
    `export default Blueprint.use(plugin, (p) => [`, ...items.map((i) => `  p.include(${i}),`), `]);`, ""].join("\n"));
};
const asCall = (name: string) => `p.calls.${name}`;
const asEvent = (name: string) => `p.events.${name}`;
const model = (root: string) => {
  const r = run(root, ["model", "--json"]);
  expect(r.status, r.out).toBe(0);
  return JSON.parse(r.stdout) as { mounts: Record<string, Node> };
};

/** A project with the three plugins generated from the fixtures, built and linked in. */
const fixtures = () => {
  const { root } = project();
  for (const name of NAMES) {
    const made = newAdapter(root, name, trimmed(name));
    expect(made.status, made.out).toBe(0);
    build(join(root, "plugins", name));
    install(root, name);
  }
  return root;
};

describe("02 includes: a mount reaches what it names and no more", () => {
  it.each(NAMES)("%s: the calls the superagent includes pass `ortho check`, and the model lists exactly those", (name) => {
    const root = fixtures();
    mount(root, name, NEEDS[name].calls.map(asCall));
    const generated = run(root, ["generate"]);
    expect(generated.status, generated.out).toBe(0);
    const checked = run(root, ["check"]);
    expect(checked.status, checked.out).toBe(0);
    expect([...(model(root).mounts[name]?.["calls"] ?? [])].sort()).toEqual([...NEEDS[name].calls].sort());
  });

  it("a mount that includes nothing reaches nothing, one call reaches one, and naming a call twice lists it once", () => {
    const root = fixtures();
    mount(root, "github", []);
    expect(model(root).mounts["github"]?.["calls"] ?? []).toEqual([]);
    mount(root, "github", ["p.calls.pulls.get"]);
    expect(model(root).mounts["github"]?.["calls"]).toEqual(["pulls.get"]);
    mount(root, "github", ["p.calls.pulls.get", "p.calls.pulls.get"]);
    expect(model(root).mounts["github"]?.["calls"]).toEqual(["pulls.get"]);
  });

  it("GitHub's events the superagent listens to are in the model once included", () => {
    const root = fixtures();
    mount(root, "github", [...NEEDS.github.calls.map(asCall), ...NEEDS.github.events.map(asEvent)]);
    const events = model(root).mounts["github"]?.["events"] as ReadonlyArray<string> | undefined;
    expect([...(events ?? [])].sort()).toEqual([...NEEDS.github.events].sort());
  });
});

describe("02 includes: a call or event the spec doesn't have fails `ortho check`", () => {
  const refused = (root: string, name: string, items: ReadonlyArray<string>, says: RegExp) => {
    mount(root, name, items);
    run(root, ["generate"]);
    const r = run(root, ["check"]);
    expect(r.status, `ortho check should refuse:\n${r.out}`).not.toBe(0);
    expect(r.out).toContain(mountFile(name));
    expect(r.out).toMatch(says);
  };

  it("a misspelt call in a real group, a call no group has, and a wrong case, each named, for each service", () => {
    const root = fixtures();
    refused(root, "github", ["p.calls.issues.createComent"], /includes the call issues\.createComent, which @orthograph\/github doesn't have/);
    refused(root, "github", ["(p.calls as any).notACall"], /includes the call notACall, which @orthograph\/github doesn't have/);
    refused(root, "github", ["(p.calls.issues as any).createcomment"], /includes the call issues\.createcomment, which @orthograph\/github doesn't have/);
    refused(root, "slack", ["(p.calls as any).chatPostmessage"], /includes the call chatPostmessage, which @orthograph\/slack doesn't have/);
    refused(root, "posthog", ["(p.calls as any).errorTrackingIssuesDelete"], /includes the call errorTrackingIssuesDelete, which @orthograph\/posthog doesn't have/);
  });

  it("a call the spec has but another service's mount does, and one from a group that is not there", () => {
    const root = fixtures();
    refused(root, "github", ["(p.calls as any).chatPostMessage"], /includes the call chatPostMessage, which @orthograph\/github doesn't have/);
    refused(root, "github", ["(p.calls as any).nope?.create"], /include takes one of @orthograph\/github's calls/);
  });

  it("an event the spec doesn't have, an event misspelt, and a call named where an event goes", () => {
    const root = fixtures();
    refused(root, "github", ["(p.events as any).issueComent"], /includes the event issueComent, which @orthograph\/github doesn't have/);
    refused(root, "github", ["(p.events as any).notAnEvent"], /includes the event notAnEvent, which @orthograph\/github doesn't have/);
    refused(root, "github", ["(p.events as any).pulls"], /includes the event pulls, which @orthograph\/github doesn't have/);
    refused(root, "posthog", ["(p.events as any).alert"], /includes the event alert, which @orthograph\/posthog doesn't have/);
  });

  it("one wrong include among right ones still fails, and names only the wrong one", () => {
    const root = fixtures();
    mount(root, "github", [...NEEDS.github.calls.map(asCall), "(p.calls.pulls as any).createReveiw"]);
    run(root, ["generate"]);
    const r = run(root, ["check"]);
    expect(r.status).not.toBe(0);
    expect(r.out).toMatch(/includes the call pulls\.createReveiw, which @orthograph\/github doesn't have/);
    for (const right of NEEDS.github.calls) expect(r.out, right).not.toMatch(new RegExp(`includes the call ${right.replace(".", "\\.")},`));
  });
});

describe("02 includes: the plugins the app holds, with Slack's hand-written events", () => {
  const held = () => {
    const { root } = project();
    for (const name of NAMES) { build(appPlugin(name)); install(root, name, appPlugin(name)); }
    return root;
  };

  it.each(NAMES)("%s: every call and event the superagent includes is in the plugin, and a missing one is refused", (name: Name) => {
    const root = held();
    mount(root, name, [...NEEDS[name].calls.map(asCall), ...NEEDS[name].events.map(asEvent)]);
    const r = run(root, ["model", "--json"]);
    expect(r.status, r.out).toBe(0);
    const mounted = (JSON.parse(r.stdout) as { mounts: Record<string, Node> }).mounts[name];
    expect([...(mounted?.["calls"] ?? [])].sort()).toEqual([...NEEDS[name].calls].sort());
    expect([...(mounted?.["events"] ?? [])].sort()).toEqual([...NEEDS[name].events].sort());
    mount(root, name, [...NEEDS[name].calls.map(asCall), "(p.events as any).appMentionn"]);
    run(root, ["generate"]);
    const refused = run(root, ["check"]);
    expect(refused.status).not.toBe(0);
    expect(refused.out).toMatch(new RegExp(`includes the event appMentionn, which @orthograph/${name} doesn't have`));
  });

  it("the held GitHub plugin has every GitHub call and event the fixture does, so the app's choice is a narrowing, not a copy", () => {
    const spec = readSpec(trimmed("github"));
    const root = held();
    mount(root, "github", [...operations(spec).map((o) => asCall(o.name)), ...webhooks(spec).map((e) => asEvent(e.name))]);
    const checked = run(root, ["model", "--json"]);
    expect(checked.status, checked.out).toBe(0);
  });
});
