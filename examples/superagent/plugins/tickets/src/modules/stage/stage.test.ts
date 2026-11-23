import { describe, expect, it } from "vitest";
import { stageOf } from "./service.ts";
import type { Facts } from "./types.ts";

const none: Facts = { report: undefined, assignment: undefined, attention: undefined, undelivered: undefined, person: undefined };
const open = { state: "open" };

describe("the stage table", () => {
  it("an ended or stopped ticket is ended, whatever else it has", () => {
    expect(stageOf({ state: "ended" }, { ...none, attention: {} })).toMatchObject({ stage: "ended", why: "none" });
  });

  it("an input that could not be delivered waits for a person, first", () => {
    expect(stageOf(open, { ...none, undelivered: {}, attention: {} })).toMatchObject({ stage: "person", why: "delivery" });
  });

  it("an open question waits for an answer", () => {
    expect(stageOf(open, { ...none, attention: {} })).toMatchObject({ stage: "person", why: "answer" });
  });

  it("a ready report waits for review", () => {
    expect(stageOf(open, { ...none, report: { state: "ready", seq: 1n } })).toMatchObject({ stage: "person", why: "review" });
  });

  it("a blocked or failed report waits for a person until a person writes after it", () => {
    const report = { state: "blocked", seq: 5n };
    expect(stageOf(open, { ...none, report, assignment: { state: "running" } })).toMatchObject({ stage: "person", why: "blocked" });
    expect(stageOf(open, { ...none, report: { state: "failed", seq: 5n }, assignment: { state: "running" } })).toMatchObject({ why: "failed" });
    expect(stageOf(open, { ...none, report, person: { seq: 6n }, assignment: { state: "running" } })).toMatchObject({ stage: "working" });
    expect(stageOf(open, { ...none, report, person: { seq: 4n }, assignment: { state: "running" } })).toMatchObject({ stage: "person" });
  });

  it("no assignment, or a pending one, is queued", () => {
    expect(stageOf(open, none)).toMatchObject({ stage: "working", why: "queued" });
    expect(stageOf(open, { ...none, assignment: { state: "pending" } })).toMatchObject({ stage: "working", why: "queued" });
  });

  it("a waiting report, or an ended assignment, waits for a trigger", () => {
    expect(stageOf(open, { ...none, report: { state: "waiting", seq: 1n }, assignment: { state: "running" } })).toMatchObject({ stage: "idle" });
    expect(stageOf(open, { ...none, assignment: { state: "ended" } })).toMatchObject({ stage: "idle" });
  });

  it("a closing assignment is stopping, below a question and a ready report", () => {
    expect(stageOf(open, { ...none, assignment: { state: "closing" } })).toEqual({ stage: "working", why: "none", label: "Stopping" });
    expect(stageOf(open, { ...none, assignment: { state: "closing" }, attention: {} })).toMatchObject({ why: "answer" });
    expect(stageOf(open, { ...none, assignment: { state: "closing" }, report: { state: "ready", seq: 1n } })).toMatchObject({ why: "review" });
  });

  it("otherwise it is working", () => {
    expect(stageOf(open, { ...none, assignment: { state: "running" } })).toMatchObject({ stage: "working", why: "none" });
  });
});
