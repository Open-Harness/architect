// Check 00: the oracle the other checks judge by is itself sound. Nothing here touches the generator: it shows the pinned
// fixtures are the pinned bytes, that each call and event the superagent includes is in its spec, and that the examples
// and wrong values the checks plant are what they say (a sample fits its schema; a plant never does).
import { describe, expect, it } from "vitest";
import { NEEDS } from "./needs.ts";
import { NAMES, PINS, sha256, trimmed } from "./pins.ts";
import { plants, problems, sample } from "./schema.ts";
import { nameParts, operationNamed, operations, readSpec, webhooks } from "./spec.ts";

describe("00 the oracle: names", () => {
  it("one rule: an operationId's slashes and dots are groups, its dashes and underscores are camel case", () => {
    expect(nameParts("issues/create-comment")).toEqual(["issues", "createComment"]);
    expect(nameParts("pulls/create-review-comment")).toEqual(["pulls", "createReviewComment"]);
    expect(nameParts("chat_postMessage")).toEqual(["chatPostMessage"]);
    expect(nameParts("error_tracking_issues_partial_update")).toEqual(["errorTrackingIssuesPartialUpdate"]);
    expect(nameParts("repos/get-content")).toEqual(["repos", "getContent"]);
  });
});

describe.each(NAMES)("00 the oracle: %s's pinned fixture", (name) => {
  const spec = readSpec(trimmed(name));
  it("is the pinned file, of the pinned spec", () => {
    expect(sha256(trimmed(name))).toBe(PINS[name].trimmed.sha256);
    expect(`${spec.title} ${spec.version}`).toBe(`${PINS[name].title} ${PINS[name].version}`);
  });

  it("holds every call and event the superagent includes, and neighbours it does not", () => {
    for (const call of NEEDS[name].calls) expect(operations(spec).map((o) => o.name), call).toContain(call);
    const events = webhooks(spec).map((e) => e.name);
    for (const event of NEEDS[name].events.filter(() => name === "github")) expect(events, event).toContain(event);
    // a call and an event the app leaves out are there too, so "only what it includes" can be told from "everything"
    expect(operations(spec).length).toBeGreaterThan(NEEDS[name].calls.length);
    if (name === "github") expect(events).toContain("star");
  });
});

describe.each(NAMES)("00 the oracle: %s's examples and wrong values", (name) => {
  const spec = readSpec(trimmed(name));
  it("every included call's answer: the examples fit the schema and every planted wrong value does not", () => {
    for (const call of NEEDS[name].calls) {
      const op = operationNamed(spec, call);
      expect(op.success, `${call} has a success answer`).toBeDefined();
      for (const full of [false, true]) {
        const base = sample(spec, op.success!.schema, { full });
        expect(problems(spec, op.success!.schema, base), `${call} sample`).toEqual([]);
        const wrong = plants(spec, op.success!.schema, base);
        expect(wrong.length, `${call} has plants`).toBeGreaterThan(2);
        for (const p of wrong) expect(problems(spec, op.success!.schema, p.value), `${call}: ${p.label}`).not.toEqual([]);
      }
    }
  });

});

describe("00 the oracle: github's events and wrong values", () => {
  const spec = readSpec(trimmed("github"));
  it("every included event's payload: each action's example fits and each planted wrong value does not", () => {
    for (const event of webhooks(spec).filter((e) => NEEDS.github.events.includes(e.name))) {
      expect(event.actions.length, event.name).toBeGreaterThan(0);
      for (const action of event.actions) {
        const base = sample(spec, action.schema, { full: true });
        expect(problems(spec, action.schema, base), action.entry).toEqual([]);
        const wrong = plants(spec, action.schema, base);
        expect(wrong.length, `${action.entry} has plants`).toBeGreaterThan(2);
        for (const p of wrong) expect(problems(spec, action.schema, p.value), `${action.entry}: ${p.label}`).not.toEqual([]);
      }
    }
  });
});
