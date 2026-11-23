import { describe, expect, it } from "vitest";
import { Values } from "#modules/values/service.js";
import { Things } from "#modules/things/service.js";
import { Roles } from "./service.ts";

const Organization = Things.thing({ description: "x", fields: { id: Values.id("org"), owner: Values.id("per") } });
const owner = Roles.role(Organization, { rule: (org, principal) => org.owner === principal.person });

describe("roles", () => {
  it("decide on an instance and a principal", () => {
    const org = { id: "org_1", owner: "per_ada", state: "active" } as never;
    expect(owner.rule(org, { kind: "person", person: "per_ada", via: "session" })).toBe(true);
    expect(owner.rule(org, { kind: "person", person: "per_bob", via: "session" })).toBe(false);
  });

  it("point at another thing through a payload field", () => {
    const of = owner.of("organization");
    expect(of.role).toBe(owner);
    expect(of.path).toBe("organization");
  });
});

describe("roles that narrow, and the other principals", () => {
  const Mounted = { kind: "mount", plugin: {}, verbs: [], calls: {} } as never;

  it(".via keeps the ways named, sorted; .notVia keeps all the others", () => {
    expect(owner.of("organization").via("session", "device")).toMatchObject({ kind: "narrowed", via: ["device", "session"] });
    expect(owner.notVia("agent")).toMatchObject({ kind: "narrowed", via: ["device", "key", "session"] });
    expect(Roles.signedIn.notVia("agent", "key").via).toEqual(["device", "session"]);
  });

  it("the narrowed entry keeps the role it narrowed", () => {
    const narrowed = owner.of("organization").via("session");
    expect((narrowed.entry as { path: string }).path).toBe("organization");
  });

  it("a service role names its mount and has no way in to narrow", () => {
    const service = Roles.role(Organization, { service: Mounted });
    expect(service.service).toBe(Mounted);
    expect("via" in service).toBe(false);
    expect(service.rule({ id: "org_1", owner: "per_ada", state: "active" } as never, { kind: "person", person: "per_ada", via: "session" })).toBe(false);
  });

  it("system is an entry of its own", () => {
    expect(Roles.system).toEqual({ kind: "system" });
  });
});
