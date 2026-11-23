// Check 64 (Goal 17 slice 10): the refusals GOAL17-source-from states that slice 5's check 15 left to slice 11 (README, item 4b):
//   :322  a `gone` error that is not in the reply call's errors
//   :324  a `config` with no `me` of the { id, login } shape
//   :326  a connection that names an event no kind the source makes produces
//   :325  (second half) an `environment.of` that returns a key not in `variables`
// Each is planted past TypeScript (`as any`), in a copy of the app, and `ortho check` must refuse it naming the file or the
// thing, with no `TS` error among its words. Each has a control, the same copy with the fault undone, which passes, so a refusal
// is for the planted fault and no other. `environment.of` is also judged directly, since it is a pure function: it answers
// exactly the names `variables` declares, for every trigger the mapping makes.
import { afterEach, describe, expect, it } from "vitest";
import { check, copyApp, edit, removeCopies, run, swapPlugins } from "./app.ts";
import { COMMENT_CREATED, GITHUB_CONFIG, ISSUE_OPENED, REVIEW_SUBMITTED, SLACK_CONFIG } from "./connections.ts";
import { ctx, sourceKind } from "./sources.ts";
import { APP_MENTION, USER_MESSAGE } from "./slack-events.ts";

afterEach(removeCopies);

const GITHUB = "blueprint/sources/github.ts";
const CODER = "blueprint/agents/coding.ts";
const verdict = (root: string) => {
  const g = run(root, ["generate"]);
  const c = check(root);
  return { passes: g.status === 0 && c.status === 0, out: `${g.out}\n${c.out}` };
};
const refused = (root: string, ...mentions: ReadonlyArray<string | RegExp>) => {
  const v = verdict(root);
  expect(v.passes, `ortho check should refuse:\n${v.out}`).toBe(false);
  expect(v.out, "the refusal is the model's own: the fault was written past TypeScript").not.toMatch(/\bTS\d{4}\b/);
  for (const m of mentions) expect(v.out, `the refusal should mention ${String(m)}`).toMatch(typeof m === "string" ? new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) : m);
};
const passes = (root: string) => { const v = verdict(root); expect(v.passes, `the control should pass:\n${v.out}`).toBe(true); };
const intake = (root: string, change: (t: string) => string, file = GITHUB) => swapPlugins(root, (dirs) => edit(dirs["intake"]!, file, change));

/** A declared error class beside the source, which no call of GitHub's declares. */
const STRAY = `import { Blueprint as StrayBlueprint } from "orthograph";\nclass Stray extends StrayBlueprint.error({}, { exit: 99 }) {}\n`;

describe("64 :322 a `gone` error is one the reply call declares", () => {
  it("control: the copy as it is, and the copy with a declared error class that `gone` does not list, are not refused", () => {
    passes(copyApp());
    const root = copyApp();
    intake(root, (t) => STRAY + t);
    passes(root);
  });

  it("an error the reply call (`issues.createComment`) does not declare, listed in `gone`, is refused, naming the error, `gone` and the call", () => {
    const root = copyApp();
    intake(root, (t) => STRAY + t.replace(/gone:\s*\[\s*\]/, "gone: [Stray as any]"));
    refused(root, "Stray", "gone", /createComment/);
  });

  it("the same for Slack's reply: an error `chatPostMessage` does not declare", () => {
    const root = copyApp();
    intake(root, (t) => STRAY + t.replace(/gone:\s*\[\s*\]/, "gone: [Stray as any]"), "blueprint/sources/slack.ts");
    refused(root, "Stray", "gone", /chatPostMessage/);
  });
});

describe("64 :324 a `config` has a `me` of the { id, login } shape", () => {
  it("a config with no `me` is refused, naming the source and `me`", () => {
    const root = copyApp();
    intake(root, (t) => t.replace(/config:\s*Config,/, "config: Schema.Struct({ repo: Schema.String, events: Schema.Array(Schema.String) }) as any,"));
    refused(root, /\bme\b/, /githubSource|github/);
  });

  it("a `me` that is a plain string, or has an `id` and no `login`, or a `login` and no `id`, is refused the same way", () => {
    for (const me of ["Schema.String", "Schema.Struct({ id: Schema.String })", "Schema.Struct({ login: Schema.String })", "Schema.Struct({ id: Schema.Number, login: Schema.String })"]) {
      const root = copyApp();
      intake(root, (t) => t.replace(/config:\s*Config,/, `config: Schema.Struct({ repo: Schema.String, me: ${me}, events: Schema.Array(Schema.String) }) as any,`));
      refused(root, /\bme\b/);
    }
  });
});

describe("64 :326 a connection names only events some kind the source makes produces", () => {
  it("control: the coding agent's `events: [issues, comments, reviews, checks]` are each a group of kinds GitHub's mapping makes, and pass", () => {
    passes(copyApp());
  });

  it("an event no kind produces (`bogus`), in a declared connection, is refused, naming it and the source", () => {
    const root = copyApp();
    edit(root, CODER, (t) => t.replace(/events:\s*\["issues", "comments", "reviews", "checks"\]/, `events: ["issues", "comments", "reviews", "checks", "bogus" as any]`));
    refused(root, "bogus", /githubSource|github/);
  });

  it("each of the four groups is needed to be named, and one left out is not refused (a connection may listen to fewer)", () => {
    const root = copyApp();
    edit(root, CODER, (t) => t.replace(/events:\s*\["issues", "comments", "reviews", "checks"\]/, `events: ["comments"]`));
    passes(root);
  });
});

describe("64 :325 `environment.of` answers the names `variables` declares, no others", () => {
  it("a key `of` returns that `variables` does not declare is refused, naming it", () => {
    const root = copyApp();
    intake(root, (t) => t.replace(/GITHUB_NUMBER: String\(m\.channel\.number\) \}\)/, "GITHUB_NUMBER: String(m.channel.number), GITHUB_STRAY: \"x\" } as any)"));
    refused(root, "GITHUB_STRAY");
  });

  it("each source's `of`, for each trigger its mapping makes, answers exactly the names it declares (the real mappings, not a plant)", async () => {
    const github = await sourceKind("github");
    const onGithub = github.spec.on;
    const c = ctx(GITHUB_CONFIG);
    for (const t of [onGithub["issueComment"]!(COMMENT_CREATED, c), onGithub["pullRequestReview"]!(REVIEW_SUBMITTED, c), onGithub["issues"]!(ISSUE_OPENED, c)]) {
      expect(Object.keys(github.spec.environment.of(t)).sort()).toEqual(Object.keys(github.spec.environment.variables).sort());
    }
    const slack = await sourceKind("slack");
    const cs = ctx(SLACK_CONFIG);
    for (const t of [slack.spec.on["appMention"]!(APP_MENTION, cs), slack.spec.on["message"]!(USER_MESSAGE, cs)]) {
      expect(Object.keys(slack.spec.environment.of(t)).sort()).toEqual(Object.keys(slack.spec.environment.variables).sort());
    }
  });
});
