// Check 27 (#901, from #747): a delivery whose event id the inbox already holds, but whose event says something else, is answered `seen` and
// is never silent: the door's span tree for that request holds `in.mismatch` (M5-reach-out Q2.2, "A `seen` whose fields differ from the kept
// ones is a defect on the span (`in.mismatch`), never silent"; GOAL17-repeat-mismatch says which fields). The reviewer's live case is first: an
// edited GitHub review keeps its `submitted_at`, so its id (GOAL17-connections A), and the edit was answered `seen` with nothing said.
// What is compared is the event's object (the review, the comment, the message), not what GitHub or Slack wrap around it, so the repeats check
// 63 calls one event (another delivery id, sender, installation or action; a message delivered again as an app mention) say nothing.
// Spans are read from the world's own Collector, by the trace each request carried: `in.mismatch` must carry a `defect` attribute, as every
// defect on a span does. The kept row is read back by the first delivery's trace, and a repeat never changes it.
// Every field of the GitHub object but its id and version, and Slack's user, text and thread, is varied one at a time.
// CONTROLS (proved by hand on #901's pull request): today's door, which never compares, fails the three mismatches; a door that compares the
// whole body fails the four repeats that are one event; a door that says `in.mismatch` on every `seen` fails the exact redelivery.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { Effect, Exit, Scope } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Collectors, Worlds, type Span } from "@orthograph/prove";
import { build, lazy, removeCopies } from "./app.ts";
import { CHECK_ON_PR, COMMENT_CREATED, COMMENT_EDITED, ISSUE_OPENED, PR_CLOSED, REVIEW_COMMENT_CREATED, REVIEW_SUBMITTED, githubPayload, setAt, type Obj } from "./connections.ts";
import { github, journalOf, slack, trace, type Door } from "./door.ts";
import { APP_MENTION, USER_MESSAGE } from "./slack-events.ts";

const sleep = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
interface Seen extends Door { readonly spans: (trace: string, mount: string) => Promise<ReadonlyArray<Span>> }

/** The app in a world with a Collector, its doors' secrets made here, as check 63 opens it. */
const open = async (): Promise<Seen> => {
  const built = build();
  const secrets = { github: `ghs_${randomBytes(16).toString("hex")}`, slack: `sls_${randomBytes(16).toString("hex")}` };
  const dir = mkdtempSync(join(tmpdir(), "ortho-s27-"));
  const scope = Effect.runSync(Scope.make());
  const made = await Effect.runPromise(Effect.gen(function* () {
    const collector = yield* Collectors.local(dir, []);
    const world = yield* Worlds.start({
      root: built.root, port: 0, name: "superagent-mismatch", otlp: collector.url,
      secretEnv: { GITHUB_WEBHOOK_SIGNING: secrets.github, SLACK_WEBHOOK_SIGNING: secrets.slack, POSTHOG_WEBHOOK_SIGNING: randomBytes(16).toString("hex") },
    });
    return { collector, world };
  }).pipe(Effect.onError(() => Scope.close(scope, Exit.void)), Scope.provide(scope)));
  const read = async (t: string): Promise<ReadonlyArray<Span>> => (await Effect.runPromise(made.collector.find(t)))?.spans ?? [];
  return {
    url: made.world.url, secrets,
    close: async () => { await Effect.runPromise(Scope.close(scope, Exit.void)); rmSync(dir, { recursive: true, force: true }); },
    // The door's spans for one request: wait for its root span, `in.<mount>`, which ends after every span inside it, so they are exported with
    // it or before it; then a moment more for the export to land.
    spans: async (t, mount) => {
      const end = Date.now() + 20_000;
      while (Date.now() < end) {
        if ((await read(t)).some((s) => s.name === `in.${mount}`)) { await sleep(500); break; }
        await sleep(100);
      }
      return read(t);
    },
  };
};

const world = lazy(() => open());
afterAll(async () => { await (await world().catch(() => undefined))?.close(); removeCopies(); });

const said = (a: { status: number; body: unknown }) => [a.status, a.body];
const ACCEPTED = [200, { accepted: true }];
const SEEN = [200, { seen: true }];

/** Send `first`, which must be new, then `again`: answered seen, and its spans say `in.mismatch` exactly when `differs`; nothing is written for it. */
const repeat = async (send: (d: Seen, body: Obj, t?: string) => Promise<{ status: number; body: unknown }>, mount: string, first: Obj, again: Obj, differs: boolean) => {
  const d = await world();
  const f = trace();
  expect(said(await send(d, first, f.header)), "the first delivery is new").toEqual(ACCEPTED);
  const t = trace();
  expect(said(await send(d, again, t.header)), "the repeat").toEqual(SEEN);
  const spans = await d.spans(t.id, mount);
  expect(spans.map((s) => s.name), "the door's outcome span").toContain(`in.${mount}.seen`);
  // A defect on the span (Q2.2, GOAL17-repeat-mismatch): a span `in.mismatch` whose `defect` attribute is set, which trace trees and `watch` show.
  const mismatch = spans.filter((s) => s.name === "in.mismatch" && typeof s.attrs["defect"] === "string" && s.attrs["defect"] !== "");
  expect(mismatch.length > 0, differs ? "the repeat says something else: in.mismatch, with its defect" : "the repeat is the same event: no in.mismatch").toBe(differs);
  if (!differs) expect(spans.map((s) => s.name), "no in.mismatch span at all").not.toContain("in.mismatch");
  expect(await journalOf(d.url, t.id), "a repeat writes nothing").toEqual([]);
  const kept = (await journalOf(d.url, f.id)).filter((r) => r.operation === `in:${mount}`);
  expect(kept.map((r) => r.fields), "the first delivery's row is kept as it came").toEqual([first]);
};
const gh = (event: string) => (d: Seen, body: Obj, t?: string) => github(d, event, body, t === undefined ? {} : { trace: t });
const sl = (d: Seen, body: Obj, t?: string) => slack(d, body, t === undefined ? {} : { trace: t });

describe("27 a repeat that differs is not silent: github", () => {
  const review = setAt(REVIEW_SUBMITTED, "review.id", 7701);
  it("an edited review keeps its submitted_at, so its id: the edit is seen, and says in.mismatch (the reviewer's live case)", async () => {
    // As GitHub sends the edit: the `edited` webhook, with `changes`, the review's new body and its submitted_at as it was.
    const edited = githubPayload("pull-request-review-edited", {
      action: "edited", sender: review["sender"]!, repository: review["repository"]!, pull_request: review["pull_request"]!, changes: { body: { from: "This needs a test." } },
      review: { ...(review["review"] as Obj), body: "This needs a test, and a changelog line." },
    });
    await repeat(gh("pull_request_review"), "github", review, edited, true);
  });

  it("the same review delivered again with its body and submitted_at, so its id, but another state says in.mismatch", async () => {
    // Not only the body is compared: the review's whole object is (GOAL17-repeat-mismatch).
    const kept = setAt(setAt(REVIEW_SUBMITTED, "review.id", 7703), "review.state", "commented");
    await repeat(gh("pull_request_review"), "github", kept, setAt(kept, "review.state", "changes_requested"), true);
  });

  it("a comment delivered again with the same id and change time but another body says in.mismatch", async () => {
    const comment = setAt(COMMENT_CREATED, "comment.id", 9701);
    await repeat(gh("issue_comment"), "github", comment, setAt(comment, "comment.body", "@agent never mind"), true);
  });

  it("the same review delivered again, by another delivery id, is the same event: no in.mismatch", async () => {
    const same = setAt(REVIEW_SUBMITTED, "review.id", 7702);
    await repeat(gh("pull_request_review"), "github", same, same, false);
  });

  for (const [what, change] of [
    ["another sender", (c: Obj) => setAt(c, "sender.id", 7)],
    ["another installation", (c: Obj) => ({ ...c, installation: { id: 99 } })],
    // The edit event of the same comment at the same time, as check 63 sends it.
    ["another action around the same comment", (c: Obj) => setAt(setAt(setAt(COMMENT_EDITED, "comment.id", (c["comment"] as Obj)["id"]!), "comment.updated_at", (c["comment"] as Obj)["updated_at"]!), "comment.body", (c["comment"] as Obj)["body"]!)],
  ] as const) {
    it(`the same comment with ${what} is the same event (check 63): no in.mismatch`, async () => {
      const comment = setAt(COMMENT_CREATED, "comment.id", 9710 + what.length);
      await repeat(gh("issue_comment"), "github", comment, change(comment), false);
    });
  }
});

/**
 * One field of an object changed and kept valid: a string gets a suffix (a URL a path, a time a minute later, a known enum another value), a number one more, a
 * flag its opposite, and an object its first changeable field.
 */
const ENUMS: Readonly<Record<string, string>> = { author_association: "MEMBER", state: "changes_requested" };
const changed = (k: string, v: unknown): unknown => {
  if (ENUMS[k] !== undefined) return v === ENUMS[k] ? "COMMENTED" : ENUMS[k];
  if (typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v)) return new Date(Date.parse(v) + 60_000).toISOString();
  if (typeof v === "string") return /^https?:/.test(v) ? `${v}/x` : `${v}-x`;
  if (typeof v === "number") return v + 1;
  if (typeof v === "boolean") return !v;
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    const [first] = Object.entries(v as Obj).filter(([, x]) => x !== null);
    return first === undefined ? v : { ...(v as Obj), [first[0]]: changed(first[0], first[1]) };
  }
  return v;
};

// Every field of the event's object but its id and version (GOAL17-connections A: they make the id) is compared (GOAL17-repeat-mismatch):
// one case each, so a door that compares some of them only fails here (the second 🔍 of #941, the row "one required part left out").
describe("27 a repeat that differs is not silent: every field of a github object", () => {
  for (const [what, event, key, base, version, idAt] of [
    ["review", "pull_request_review", "review", REVIEW_SUBMITTED, "submitted_at", 7800],
    ["comment", "issue_comment", "comment", COMMENT_CREATED, "updated_at", 9800],
  ] as const) {
    const fields = Object.keys(base[key] as Obj).filter((k) => k !== "id" && k !== version);
    fields.forEach((field, i) => {
      it(`a ${what} re-sent with only its ${field} changed says in.mismatch`, async () => {
        const kept = setAt(base, `${key}.id`, idAt + i);
        const object = kept[key] as Obj;
        await repeat(gh(event), "github", kept, { ...kept, [key]: { ...object, [field]: changed(field, object[field]) as never } }, true);
      });
    });
  }
});

// Each other event the app takes compares its own object too (the 🔍's fourth pass: a door that finds the object of reviews and comments only).
describe("27 a repeat that differs is not silent: every other github event", () => {
  for (const [what, event, base, key, idPath, id, field] of [
    ["an issue", "issues", ISSUE_OPENED, "issue", "issue.number", 2715, "title"],
    ["a review comment", "pull_request_review_comment", REVIEW_COMMENT_CREATED, "comment", "comment.id", 9715, "body"],
    ["a check run", "check_run", CHECK_ON_PR, "check_run", "check_run.id", 5715, "conclusion"],
    ["a closed pull request", "pull_request", PR_CLOSED, "pull_request", "pull_request.number", 2716, "title"],
  ] as const) {
    it(`${what} re-sent with only its ${field} changed says in.mismatch`, async () => {
      const kept = setAt(base, idPath, id);
      const object = kept[key] as Obj;
      const value = field === "conclusion" ? (object[field] === "failure" ? "success" : "failure") : changed(field, object[field]);
      await repeat(gh(event), "github", kept, { ...kept, [key]: { ...object, [field]: value as never } }, true);
    });
  }
});

describe("27 a repeat that differs is not silent: slack", () => {
  it("a message delivered again for one ts by another user says in.mismatch", async () => {
    const first = setAt(setAt(USER_MESSAGE, "event.ts", "1700000027.000040"), "event_id", "Ev27G");
    await repeat(sl, "slack", first, setAt(setAt(first, "event_id", "Ev27H"), "event.user", "U0OTHER01"), true);
  });

  const ts = (n: number) => `1700000027.0000${n}`;
  it("a message delivered again for one ts with other text says in.mismatch", async () => {
    const first = setAt(setAt(USER_MESSAGE, "event.ts", ts(10)), "event_id", "Ev27A");
    const other = setAt(setAt(first, "event_id", "Ev27B"), "event.text", "Never mind the slug parser.");
    await repeat(sl, "slack", first, other, true);
  });

  it("a message delivered again for one ts and text but in another thread says in.mismatch", async () => {
    const first = setAt(setAt(USER_MESSAGE, "event.ts", ts(30)), "event_id", "Ev27E");
    await repeat(sl, "slack", first, setAt(setAt(first, "event_id", "Ev27F"), "event.thread_ts", "1700000027.000001"), true);
  });

  it("one message delivered as a message and then as an app mention, each as Slack sends it, is one event: no in.mismatch", async () => {
    const asMessage = setAt(setAt(setAt(setAt(USER_MESSAGE, "event.ts", ts(20)), "event_id", "Ev27C"), "event.user", "U061F7AUR"), "event.text", "<@U0LAN0Z89> is the build green?");
    const asMention = setAt(setAt(setAt(setAt(setAt(APP_MENTION, "event.channel", "C024BE91L"), "event.ts", ts(20)), "event_id", "Ev27D"), "event.text", "<@U0LAN0Z89> is the build green?"), "event.event_ts", ts(20));
    await repeat(sl, "slack", asMessage, asMention, false);
  });
});
