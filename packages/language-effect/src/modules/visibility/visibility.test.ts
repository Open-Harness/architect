// The one visibility rule: who is shown what, for each audience, and that a field nobody declared is never shown.
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Audience, Visibility } from "./service.ts";

const Org = Blueprint.thing({ description: "A group.", fields: { id: Blueprint.id("org") } });
const owner = Blueprint.role(Org, { rule: () => true });
const member = Blueprint.role(Org, { rule: () => true });
const Token = Blueprint.visibility.secret(Blueprint.text({ max: 40 }));
const fields = {
  label: Blueprint.text({ max: 40 }),
  seen: Blueprint.traced(Blueprint.text({ max: 40 })),
  count: Blueprint.uint(64),
  note: Blueprint.visibility.private(Blueprint.text({ max: 40 }), owner),
  seal: Token,
  key: Blueprint.issued(Token),
};
const values = { label: "L", seen: "S", count: 3n, note: "N", seal: "SEAL", key: "KEY", residue: "R" };

const shownTo = (audience: Audience) => Object.keys(Visibility.redact(audience, fields, values));

describe("Visibility.sees and redact", () => {
  it("shows a principal what is public, what is private to a role they hold, and never a secret that was not issued to them", () => {
    expect(shownTo(Audience.principal([]))).toEqual(["label", "seen", "count"]);
    expect(shownTo(Audience.principal([owner]))).toEqual(["label", "seen", "count", "note"]);
    expect(shownTo(Audience.principal([member]))).toEqual(["label", "seen", "count"]);
  });

  it("lets an issued secret out only in the answer of the call that issued it, to its own caller", () => {
    expect(shownTo(Audience.principal([], { issuing: true }))).toEqual(["label", "seen", "count", "key"]);
    expect(shownTo(Audience.principal([owner], { issuing: true }))).toEqual(["label", "seen", "count", "note", "key"]);
  });

  it("shows an agent the person's roles and never a secret, issued or not", () => {
    expect(shownTo(Audience.agent([owner]))).toEqual(["label", "seen", "count", "note"]);
    expect(shownTo(Audience.agent())).toEqual(["label", "seen", "count"]);
  });

  it("shows telemetry only public values that are traceable (text only when traced), and the public record every public value", () => {
    expect(shownTo(Audience.telemetry)).toEqual(["seen", "count"]);
    expect(shownTo(Audience.public)).toEqual(["label", "seen", "count"]);
  });

  it("shows the owner public and private values, never a secret", () => {
    expect(shownTo(Audience.owner)).toEqual(["label", "seen", "count", "note"]);
  });

  it("fails closed: a key the declaration does not name is shown to no audience", () => {
    for (const audience of [Audience.principal([owner], { issuing: true }), Audience.agent([owner]), Audience.telemetry, Audience.public, Audience.owner]) {
      expect(shownTo(audience)).not.toContain("residue");
    }
  });

  it("cuts a list's items by the thing's own fields", () => {
    const answer = { items: [{ label: "L", note: "N", seal: "S", state: "open", extra: 1 }], next: null };
    const answerFields = { items: Blueprint.value(Schema.Array(Schema.Unknown)), next: Blueprint.value(Schema.NullOr(Schema.String)) };
    const items = { label: fields.label, note: fields.note, seal: fields.seal, state: Blueprint.traced(Blueprint.text({ max: 40 })) };
    expect(Visibility.redact(Audience.principal([]), answerFields, answer, items)).toEqual({ items: [{ label: "L", state: "open" }], next: null });
    expect(Visibility.redact(Audience.principal([owner]), answerFields, answer, items)).toEqual({ items: [{ label: "L", note: "N", state: "open" }], next: null });
  });
});

describe("Visibility.schema", () => {
  const decode = (audience: Audience, input: object) => Schema.decodeUnknownSync(Visibility.schema(audience, fields) as never)(input) as Record<string, unknown>;

  it("is the wire's for a principal: every declared field named, only what every caller is shown required", () => {
    const wire = Audience.principal([], { issuing: true });
    expect(Object.keys(decode(wire, { label: "L", seen: "S", count: "3", key: "K" }))).toEqual(["label", "seen", "count", "key"]);
    expect(Object.keys(decode(wire, { ...values, count: "3" }))).toEqual(["label", "seen", "count", "note", "seal", "key"]);
    expect(() => decode(wire, { label: "L", seen: "S", count: "3" })).toThrow();
    // Not the issuing call: the key is optional too.
    expect(Object.keys(decode(Audience.principal([]), { label: "L", seen: "S", count: "3" }))).toEqual(["label", "seen", "count"]);
  });

  it("is exactly what an audience is shown otherwise", () => {
    expect(Object.keys(decode(Audience.telemetry, { ...values, count: "3" }))).toEqual(["seen", "count"]);
    expect(Object.keys(decode(Audience.agent(), { label: "L", seen: "S", count: "3" }))).toEqual(["label", "seen", "count"]);
    expect(Object.keys(decode(Audience.agent(), { ...values, count: "3" }))).toEqual(["label", "seen", "count", "note"]);
  });
});

describe("Audience", () => {
  it("names the five audiences", () => {
    expect(Object.keys(Audience).sort()).toEqual(["agent", "owner", "principal", "public", "telemetry"]);
  });
});
