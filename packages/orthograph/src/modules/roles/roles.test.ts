import { describe, expect, it } from "vitest";
import { Values } from "#modules/values/service.js";
import { Things } from "#modules/things/service.js";
import { Roles } from "./service.ts";

const Organization = Things.thing({ description: "x", fields: { id: Values.id("org"), owner: Values.id("per") } });
const owner = Roles.role(Organization, { rule: (org, principal) => org.owner === principal.person });

describe("roles", () => {
  it("decide on an instance and a principal", () => {
    const org = { id: "org_1", owner: "per_ada", state: "active" } as never;
    expect(owner.rule(org, { kind: "person", person: "per_ada" })).toBe(true);
    expect(owner.rule(org, { kind: "person", person: "per_bob" })).toBe(false);
  });

  it("a who role is held by whoever a field of the thing names, and every language can render it", () => {
    const Allowance = Things.thing({ description: "x", fields: { id: Values.id("alw"), member: Values.account() } });
    const grantee = Roles.role(Allowance, { who: Allowance.fields.member });
    expect(grantee.who).toBe(Allowance.fields.member);
    expect(owner.who).toBeUndefined();
    const row = { id: "alw_1", member: "eip155:1:0xabc", state: "active" } as never;
    expect(grantee.rule(row, { kind: "person", person: "eip155:1:0xabc" })).toBe(true);
    expect(grantee.rule(row, { kind: "person", person: "eip155:1:0xdef" })).toBe(false);
  });

  it("point at another thing through a payload field", () => {
    const of = owner.of("organization");
    expect(of.role).toBe(owner);
    expect(of.path).toBe("organization");
  });
});
