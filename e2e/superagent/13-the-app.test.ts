// Check 13 (Goal 17 slice 5): the app, examples/superagent itself: what it mounts, the Settings thing, the two seat
// operations it declares, and the coding agent it declares in the blueprint (17-superagent.md, "A superagent" and "The
// folder structure"; GOAL17-executor-slots section 4). Everything is judged from the model and the generated docs, CLI and MCP.
import { afterAll, describe, expect, it } from "vitest";
import { build, cliHelp, lazy, removeCopies } from "./app.ts";
import { agents, app } from "./blueprint-names.ts";
import { describePlugin, surfaceProblems } from "./names-check.ts";

describePlugin("13", agents);

describe("13 the app: mounts, Settings, seats, and the coding agent declared", () => {
  const built = lazy(build);
  afterAll(removeCopies);

  it("it mounts the four plugins and the agents as features, and GitHub, Slack and PostHog as adapters, each from its own file", () => {
    const wrong = [
      ...app.features.filter((f) => built().model["mounts"][f]?.kind !== "feature" || built().model["mounts"][f]?.file !== `blueprint/features/${f}.ts`),
      ...app.adapters.filter((a) => built().model["mounts"][a]?.kind !== "adapter" || built().model["mounts"][a]?.file !== `blueprint/adapters/${a}.ts`),
    ];
    expect(wrong, "mounts missing, of the wrong kind, or from another file").toEqual([]);
  });

  it("it has its local and test environments", () => {
    expect(Object.keys(built().model["environments"] ?? {})).toEqual(expect.arrayContaining([...app.environments]));
  });

  it("Settings is the app's own thing, with versions, and `settings.save` is an operation of the app", () => {
    const settings = built().model["things"]["settings"];
    expect(settings?.from?.kind, "settings comes from the app").toBe("app");
    expect(typeof settings?.versions?.key, "versions: { key } in the model").toBe("string");
    for (const v of app.settingsOps) expect(built().model["operations"][`settings.${v}`]?.from?.kind, `settings.${v}`).toBe("app");
  });

  it("Settings has no pause of its own: the Superagent's pause and resume are the one switch (GOAL17-pause)", () => {
    expect(Object.keys(built().model["operations"]).filter((o) => o.startsWith("settings.") && /pause|resume/.test(o))).toEqual([]);
  });

  it("`superagent.fill` and `superagent.reap` are declared by the app, for the system alone, and are in the docs, CLI and MCP", () => {
    for (const o of app.seatOps) {
      const op = built().model["operations"][o];
      expect(op?.from?.kind, `${o} is the app's (tickets and superagent import nothing of each other)`).toBe("app");
      expect(op?.allowed, o).toEqual([{ kind: "system" }]);
    }
    expect(surfaceProblems(built(), [...app.seatOps, ...app.settingsOps.map((v) => `settings.${v}`)])).toEqual([]);
  });

  it("the coding agent is declared in the blueprint: `coder`, from `blueprint/agents/coding.ts`, on GitHub and Slack, observing, ending when its threads close", () => {
    const declared = built().model["declared"]?.["superagents"] as ReadonlyArray<any> | undefined;
    const coder = declared?.find((d) => d.name === "coder");
    expect(coder, "model.declared.superagents has no `coder`").toBeDefined();
    expect(coder.file).toBe("blueprint/agents/coding.ts");
    expect(coder.purpose).toBe("Takes asks on issues and in Slack; answers with pull requests.");
    expect(coder.connections.map((c: any) => c.source).sort()).toEqual(["github", "slack"]);
    expect(coder.policy.mode).toBe("observe");
    expect(coder.policy.allowed).toEqual(["github:583231", "slack:U024BE7LH"]);
    expect(coder.playbook.endsWhen).toBe("threadsClosed");
  });

  it("nothing is declared but the coding agent: the triage agent is made at runtime, with no code (K39: if it needs new code, the pattern is wrong)", () => {
    expect(((built().model["declared"]?.["superagents"] ?? []) as ReadonlyArray<any>).map((d) => d.name)).toEqual(["coder"]);
  });

  it("the generated CLI starts, and has a command for every thing that has an operation (a thing named like a reserved word, `eval`, must not break it)", () => {
    const help = cliHelp(built().root);
    expect(help.status, `\`superagent --help\`:\n${help.out}`).toBe(0);
    const things = new Set(Object.values<any>(built().model["operations"]).filter((o) => !o.name.startsWith("session.")).map((o) => o.thing as string));
    expect([...things].filter((t) => !new RegExp(`^\\s{2}${t}\\s`, "m").test(help.out))).toEqual([]);
  });

  it("every operation and read the model has is in the docs, CLI and MCP (the slice's done-when), so nothing the lists of checks 09 to 13 leave out is left out of them either", () => {
    // sign-in is the CLI's own `login` and an MCP client never calls it (generated/cli's `session`); a mount can narrow an operation away from agents, and the MCP then has no tool for it
    const names = Object.entries<any>(built().model["operations"]).filter(([n, o]) => !n.startsWith("session.") && (o.via === undefined || o.via.includes("agent"))).map(([n]) => n);
    expect(names.length, "the model has the app's operations").toBeGreaterThan(60);
    expect(surfaceProblems(built(), names)).toEqual([]);
  });
});
