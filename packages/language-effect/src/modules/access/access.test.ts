import { Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint, type Principal } from "orthograph";
import { recordsMemory } from "#modules/records/service.js";
import { Access } from "./service.ts";

const Person = Blueprint.thing({ description: "Someone.", fields: { id: Blueprint.id("per") } });
const Organization = Blueprint.thing({ description: "A company.", fields: { id: Blueprint.id("org"), owner: Person.fields.id } });
const Allowance = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("alw"), organization: Organization.fields.id } });
const owner = Blueprint.role(Organization, { rule: (o, p) => o.owner === p.person });
const records = recordsMemory([
  [Organization, { id: "org_1", owner: "per_ada" }],
  [Allowance, { id: "alw_1", organization: "org_1" }],
]);
const ada: Principal = { kind: "person", person: "per_ada" };
const bob: Principal = { kind: "person", person: "per_bob" };

const check = (allowed: ReadonlyArray<never>, payloadFields: object, payload: object, principal: Principal) =>
  Effect.runPromiseExit(Access.check({ allowed, payloadFields: payloadFields as never, payload, principal }).pipe(Effect.provide(records)));

describe("Access", () => {
  it("owner.of(\"organization\"): ada owns org_1, bob doesn't, and a missing org allows no one", async () => {
    const fields = { organization: Allowance.fields.organization };
    const allowed = [owner.of("organization")] as never;
    expect(Exit.isSuccess(await check(allowed, fields, { organization: "org_1" }, ada))).toBe(true);
    expect(Exit.isFailure(await check(allowed, fields, { organization: "org_1" }, bob))).toBe(true);
    expect(Exit.isFailure(await check(allowed, fields, { organization: "org_9" }, ada))).toBe(true);
  });

  it("owner.of(\"allowance.organization\") walks from the allowance to its organization", async () => {
    const fields = { allowance: Allowance.fields.id };
    const allowed = [owner.of("allowance.organization")] as never;
    expect(Exit.isSuccess(await check(allowed, fields, { allowance: "alw_1" }, ada))).toBe(true);
    expect(Exit.isFailure(await check(allowed, fields, { allowance: "alw_1" }, bob))).toBe(true);
  });

  it("the keeper is allowed only where it is listed, even by an operation open to anyone, and no one else may be the keeper", async () => {
    const keeper: Principal = { kind: "keeper" };
    expect(Exit.isSuccess(await check([Blueprint.keeper] as never, {}, {}, keeper))).toBe(true);
    expect(Exit.isFailure(await check([Blueprint.anyone] as never, {}, {}, keeper))).toBe(true);
    expect(Exit.isFailure(await check([Blueprint.signedIn] as never, {}, {}, keeper))).toBe(true);
    expect(Exit.isFailure(await check([Blueprint.keeper] as never, {}, {}, ada))).toBe(true);
    expect(Exit.isFailure(await check([Blueprint.keeper] as never, {}, {}, { kind: "anonymous" }))).toBe(true);
  });

  it("signedIn refuses the anonymous; anyone allows them", async () => {
    expect(Exit.isFailure(await check([Blueprint.signedIn] as never, {}, {}, { kind: "anonymous" }))).toBe(true);
    expect(Exit.isSuccess(await check([Blueprint.anyone] as never, {}, {}, { kind: "anonymous" }))).toBe(true);
  });
});
