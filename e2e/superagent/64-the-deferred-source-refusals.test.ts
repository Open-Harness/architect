// Check 64 (Goal 17 slice 10): the refusals GOAL17-source-from states that slice 5's check 15 left to slice 11 (README, item 4b):
//   :322  a `gone` error that is not in the reply call's errors
//   :324  a `config` with no `me` of the { id, login } shape
//   :326  a connection that names an event no kind the source makes produces
//   :325  (second half) an `environment.of` whose keys are not exactly the names `variables` declares
// Each is planted past TypeScript (`as any`) in a copy of the app whose plugins are all copies (`swapPlugins`), and `ortho check`
// must refuse it in its own form: a problem line that names the file the fault is in, and says the words on that one line, with
// no stack trace and no `TS` error anywhere, so a crash is never counted as a refusal. Each has a control that is accepted, and
// most have two: one that is as near the fault as can be and still right, so a compiler that refuses every `gone`, every inline
// `me`, every widened config or every `of` it cannot read does not pass. `environment.of` is also judged directly on every
// mapping, since it is a pure function.
import { afterEach, describe, expect, it } from "vitest";
import { check, copyApp, edit, removeCopies, run, swapPlugins } from "./app.ts";
import { CHECK_ON_PR, COMMENT_CREATED, GITHUB_CONFIG, ISSUE_OPENED, POSTHOG_ALERT, POSTHOG_CONFIG, REVIEW_COMMENT_CREATED, REVIEW_SUBMITTED, SLACK_CONFIG } from "./connections.ts";
import { ctx, sourceKind } from "./sources.ts";
import { APP_MENTION, USER_MESSAGE } from "./slack-events.ts";

afterEach(removeCopies);

const GITHUB = "blueprint/sources/github.ts";
const SLACK = "blueprint/sources/slack.ts";
const CODER = "blueprint/agents/coding.ts";
const verdict = (root: string) => {
  const g = run(root, ["generate"]);
  const c = check(root);
  return { passes: g.status === 0 && c.status === 0, out: `${g.out}\n${c.out}` };
};
/** The refusal's own form: a problem line `<file>.ts…: <sentence>` holding every word asked for; no stack trace, no exception, no TS error. */
const refused = (root: string, file: RegExp, ...words: ReadonlyArray<string | RegExp>) => {
  const v = verdict(root);
  expect(v.passes, `ortho check should refuse:\n${v.out}`).toBe(false);
  expect(v.out, "a crash is not a refusal").not.toMatch(/^\s+at .*:\d+:\d+\)?$|\b(TypeError|ReferenceError|SyntaxError|RangeError|ERR_[A-Z_]+|Unhandled|ENOENT)\b/m);
  expect(v.out, "the refusal is the model's own: the fault was written past TypeScript").not.toMatch(/\bTS\d{4}\b/);
  const lines = v.out.split("\n").filter((l) => /^[\w./@-]+\.ts\b[^:]*: /.test(l));
  const hit = lines.find((l) => file.test(l.split(": ")[0]!) || file.test(l) ? words.every((w) => (typeof w === "string" ? l.includes(w) : w.test(l))) : false);
  expect(hit, `a problem line in ${String(file)} with ${words.map(String).join(" and ")}; the problem lines were:\n${lines.join("\n")}`).toBeDefined();
};
const passes = (root: string) => { const v = verdict(root); expect(v.passes, `the control should pass:\n${v.out}`).toBe(true); };
const intake = (root: string, change: (t: string) => string, file = GITHUB) => swapPlugins(root, (dirs) => edit(dirs["intake"]!, file, change));

/** A declared error class beside the source, which no call of GitHub's declares. */
const STRAY = `import { Blueprint as StrayBlueprint } from "orthograph";\nclass Stray extends StrayBlueprint.error({}, { exit: 99 }) {}\n`;
/** `Gone`, an error `issues.createComment` declares, exported by the GitHub plugin, and the source importing it. */
const declareGone = (root: string, on: string, change: (t: string) => string) => swapPlugins(root, (dirs) => {
  edit(dirs["github"]!, "src/index.ts", (t) => t.replace("export default Blueprint.adapter({", `export class Gone extends Blueprint.error({}, { exit: 98 }) {}\n\nexport default Blueprint.adapter({`).replace(`"${on}": Blueprint.call(),`, `"${on}": Blueprint.call({ errors: [Gone as never] }),`));
  edit(dirs["intake"]!, GITHUB, (t) => change(t.replace(`import github from "@orthograph/github";`, `import github, { Gone } from "@orthograph/github";`)));
});
const FILE = /sources\/(github|slack)\.ts/;

describe("64 :322 a `gone` error is one the reply call declares", () => {
  it("control: the copy as it is, and one with a declared error class that `gone` does not list, are not refused", () => {
    passes(copyApp());
    const root = copyApp();
    intake(root, (t) => STRAY + t);
    passes(root);
  });

  it("control: a `gone` that lists an error the reply call does declare is accepted (a compiler that refuses every non-empty `gone` fails)", () => {
    const root = copyApp();
    declareGone(root, "createComment", (t) => t.replace(/gone:\s*\[\s*\]/, "gone: [Gone]"));
    passes(root);
  });

  it("an error the reply call does not declare, listed in `gone`, is refused, naming the error, `gone` and the call", () => {
    const root = copyApp();
    intake(root, (t) => STRAY + t.replace(/gone:\s*\[\s*\]/, "gone: [Stray as any]"));
    refused(root, FILE, "Stray", "gone", "createComment");
  });

  it("an error another call declares (`listComments`), listed in the reply's `gone`, is refused: one call's errors are not another's", () => {
    const root = copyApp();
    declareGone(root, "listComments", (t) => t.replace(/gone:\s*\[\s*\]/, "gone: [Gone]"));
    refused(root, FILE, "Gone", "gone", "createComment");
  });

  it("the same for Slack's reply: an error `chatPostMessage` does not declare", () => {
    const root = copyApp();
    intake(root, (t) => STRAY + t.replace(/gone:\s*\[\s*\]/, "gone: [Stray as any]"), SLACK);
    refused(root, /sources\/slack\.ts/, "Stray", "gone", "chatPostMessage");
  });
});

describe("64 :324 a `config` has a `me` of the { id, login } shape", () => {
  const CONFIG = /config:\s*Config,/;
  it("control: an inline Struct of `id` and `login` is the same shape as the shared one, and is accepted (the shape is checked, not the identity)", () => {
    const root = copyApp();
    intake(root, (t) => t.replace(CONFIG, "config: Schema.Struct({ repo: Schema.String, me: Schema.Struct({ id: Schema.String, login: Schema.String }), events: Config.fields.events }),"));
    passes(root);
  });

  it("a config with no `me` is refused, naming the source and `me`", () => {
    const root = copyApp();
    intake(root, (t) => t.replace(CONFIG, "config: Schema.Struct({ repo: Schema.String, events: Config.fields.events }) as any,"));
    refused(root, /sources\/github\.ts/, /config.*\bme\b/, "githubSource");
  });

  it.each([
    ["a plain string", "Schema.String"],
    ["an `id` and no `login`", "Schema.Struct({ id: Schema.String })"],
    ["a `login` and no `id`", "Schema.Struct({ login: Schema.String })"],
    ["a numeric `id`", "Schema.Struct({ id: Schema.Number, login: Schema.String })"],
    ["an optional `login`", "Schema.Struct({ id: Schema.String, login: Schema.optionalKey(Schema.String) })"],
  ] as const)("a `me` that is %s is refused, naming the source and `me`", (_what, me) => {
    const root = copyApp();
    intake(root, (t) => t.replace(CONFIG, `config: Schema.Struct({ repo: Schema.String, me: ${me}, events: Config.fields.events }) as any,`));
    refused(root, /sources\/github\.ts/, /config.*\bme\b/, "githubSource");
  });
});

describe("64 :326 a connection names only events some kind the source makes produces", () => {
  const WITH_BOGUS = (t: string) => t.replace(/Schema\.Literals\(\["issues", "comments", "reviews", "checks"\]\)/, `Schema.Literals(["issues", "comments", "reviews", "checks", "bogus"])`);
  const NAMED = (t: string) => t.replace(/events:\s*\["issues", "comments", "reviews", "checks"\]/, `events: ["issues", "comments", "reviews", "checks", "bogus"]`);

  it("controls: the coding agent as it is, a connection that lists fewer groups, and a config that allows a group no connection names, are accepted", () => {
    passes(copyApp());
    const fewer = copyApp();
    edit(fewer, CODER, (t) => t.replace(/events:\s*\["issues", "comments", "reviews", "checks"\]/, `events: ["comments"]`));
    passes(fewer);
    const widened = copyApp();
    intake(widened, WITH_BOGUS);
    passes(widened);
  });

  it("an event no kind produces (`bogus`), allowed by the config and named by a declared connection, is refused by the kind rule alone, naming it and the source", () => {
    const root = copyApp();
    intake(root, WITH_BOGUS);
    edit(root, CODER, NAMED);
    refused(root, /agents\/coding\.ts|sources\/github\.ts/, "bogus", "githubSource");
  });
});

describe("64 :325 `environment.of` answers exactly the names `variables` declares", () => {
  it("a key `of` returns that `variables` does not declare is refused, naming it", () => {
    const root = copyApp();
    intake(root, (t) => t.replace(/GITHUB_NUMBER: String\(m\.channel\.number\) \}\)/, "GITHUB_NUMBER: String(m.channel.number), GITHUB_STRAY: \"x\" } as any)"));
    refused(root, FILE, "GITHUB_STRAY", "environment");
  });

  it("a name `variables` declares that `of` does not return is refused too, naming it", () => {
    const root = copyApp();
    intake(root, (t) => t.replace(/GITHUB_REPOSITORY: m\.channel\.repository, GITHUB_NUMBER: String\(m\.channel\.number\) \}\)/, "GITHUB_REPOSITORY: m.channel.repository } as any)"));
    refused(root, FILE, "GITHUB_NUMBER", "environment");
  });

  it("the same for Slack: a stray key, and a missing one", () => {
    const stray = copyApp();
    intake(stray, (t) => t.replace(/SLACK_THREAD: m\.channel\.ts \}\)/, "SLACK_THREAD: m.channel.ts, SLACK_STRAY: \"x\" } as any)"), SLACK);
    refused(stray, /sources\/slack\.ts/, "SLACK_STRAY", "environment");
    const missing = copyApp();
    intake(missing, (t) => t.replace(/SLACK_CHANNEL: m\.channel\.channel, SLACK_THREAD: m\.channel\.ts \}\)/, "SLACK_CHANNEL: m.channel.channel } as any)"), SLACK);
    refused(missing, /sources\/slack\.ts/, "SLACK_THREAD", "environment");
  });

  it("each real mapping's trigger, from every event it maps, gets exactly the declared names: GitHub's five, Slack's two and PostHog's one", async () => {
    const names = (kind: Awaited<ReturnType<typeof sourceKind>>, triggers: ReadonlyArray<unknown>) => {
      for (const t of triggers) expect(Object.keys(kind.spec.environment.of(t)).sort()).toEqual(Object.keys(kind.spec.environment.variables).sort());
      expect(triggers.length).toBeGreaterThan(0);
    };
    const github = await sourceKind("github");
    const g = ctx(GITHUB_CONFIG);
    const on = github.spec.on;
    names(github, [on["issueComment"]!(COMMENT_CREATED, g), on["pullRequestReview"]!(REVIEW_SUBMITTED, g), on["pullRequestReviewComment"]!(REVIEW_COMMENT_CREATED, g), on["issues"]!(ISSUE_OPENED, g), on["checkRun"]!(CHECK_ON_PR, g)]);
    const slack = await sourceKind("slack");
    const s = ctx(SLACK_CONFIG);
    names(slack, [slack.spec.on["appMention"]!(APP_MENTION, s), slack.spec.on["message"]!(USER_MESSAGE, s)]);
    const posthog = await sourceKind("posthog");
    names(posthog, [posthog.spec.on["errorAlert"]!(POSTHOG_ALERT, ctx(POSTHOG_CONFIG))]);
  });
});
