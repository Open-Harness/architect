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
const ada: Principal = { kind: "person", person: "per_ada", via: "session" };
const bob: Principal = { kind: "person", person: "per_bob", via: "session" };

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

const adasKey: Principal = { kind: "person", person: "per_ada", via: "key" };
const adasAgent: Principal = { kind: "agent", person: "per_ada", via: "agent" };
const system: Principal = { kind: "system" };
const pricing: Principal = { kind: "service", mount: "pricing" };
const ledger: Principal = { kind: "service", mount: "ledger" };
const pricingMount = { kind: "mount" };
const priced = Blueprint.role(Organization, { service: pricingMount as never });
const mounts = new Map<unknown, string>([[pricingMount, "pricing"]]);
const checkWith = (allowed: ReadonlyArray<unknown>, principal: Principal) =>
  Effect.runPromiseExit(Access.check({ allowed: allowed as never, payloadFields: {}, payload: {}, principal, mounts }).pipe(Effect.provide(records)));
const passes = async (allowed: ReadonlyArray<unknown>, principal: Principal) => Exit.isSuccess(await checkWith(allowed, principal));

describe("Access: the five kinds", () => {
  it("an agent holds a person's roles; a narrowing keeps only the ways it names", async () => {
    const fields = { organization: Allowance.fields.organization };
    const only = (allowed: ReadonlyArray<unknown>, principal: Principal) =>
      Effect.runPromiseExit(Access.check({ allowed: allowed as never, payloadFields: fields, payload: { organization: "org_1" }, principal }).pipe(Effect.provide(records))).then(Exit.isSuccess);
    expect(await only([owner.of("organization")], adasAgent)).toBe(true);
    expect(await only([owner.of("organization").via("session", "device")], ada)).toBe(true);
    expect(await only([owner.of("organization").via("session", "device")], adasKey)).toBe(false);
    expect(await only([owner.of("organization").via("session", "device")], adasAgent)).toBe(false);
    expect(await only([owner.of("organization").notVia("agent")], adasKey)).toBe(true);
    expect(await only([owner.of("organization").notVia("agent")], adasAgent)).toBe(false);
  });

  it("signedIn admits a person and an agent, and refuses a service and the system; a narrowing applies to it", async () => {
    expect([await passes([Blueprint.signedIn], ada), await passes([Blueprint.signedIn], adasAgent)]).toEqual([true, true]);
    expect([await passes([Blueprint.signedIn], pricing), await passes([Blueprint.signedIn], system)]).toEqual([false, false]);
    expect(await passes([Blueprint.signedIn.notVia("agent")], adasAgent)).toBe(false);
    expect(await passes([Blueprint.signedIn.notVia("agent")], adasKey)).toBe(true);
  });

  it("anyone admits every kind", async () => {
    for (const principal of [{ kind: "anonymous" } as Principal, ada, adasAgent, pricing, system]) expect(await passes([Blueprint.anyone], principal)).toBe(true);
  });

  it("the system role admits the system and nobody else", async () => {
    expect(await passes([Blueprint.system], system)).toBe(true);
    for (const principal of [{ kind: "anonymous" } as Principal, ada, adasAgent, pricing]) expect(await passes([Blueprint.system], principal)).toBe(false);
  });

  it("a service role admits the service of its own mount and nobody else", async () => {
    expect(await passes([priced], pricing)).toBe(true);
    for (const principal of [{ kind: "anonymous" } as Principal, ada, adasAgent, system, ledger]) expect(await passes([priced], principal)).toBe(false);
  });

  it("a rule role refuses the system and a service", async () => {
    expect(await passes([owner], system)).toBe(false);
    expect(await passes([owner.of("organization")], pricing)).toBe(false);
  });

  // K40 fixes 1 and 3: two role forms that name no person.
  const Account = Blueprint.thing({ description: "An outside account.", fields: { id: Blueprint.id("acc"), superagent: Blueprint.id("sag"), source: Blueprint.text(), external: Blueprint.text() } });
  const Claim = Blueprint.thing({ description: "A claim.", fields: { id: Blueprint.id("clm"), account: Account.fields.id, agent: Blueprint.id("agt") } });
  const accountMachine = Blueprint.machine(Account, { states: ["seen", "listed"], moves: { list: { from: ["seen"], to: "listed", emits: Blueprint.event({ account: Account.fields.id }) } }, notFrom: { exit: 40 } });
  const listed = Blueprint.role(Account, { actor: { mount: Account.fields.source, id: Account.fields.external }, within: Account.fields.superagent, while: [accountMachine.states.listed] });
  const itsAgent = Blueprint.role(Claim, { agent: Claim.fields.agent });
  const world = recordsMemory([
    [Account, { id: "acc_1", superagent: "sag_1", source: "github", external: "583231", state: "listed" }],
    [Account, { id: "acc_2", superagent: "sag_1", source: "github", external: "999", state: "seen" }],
    [Claim, { id: "clm_1", account: "acc_1", agent: "agt_main" }],
  ]);
  const run = (allowed: ReadonlyArray<never>, payloadFields: object, payload: object, principal: Principal) =>
    Effect.runPromiseExit(Access.check({ allowed, payloadFields: payloadFields as never, payload, principal }).pipe(Effect.provide(world)));
  const sender = (id: string, mount = "github"): Principal => ({ kind: "service", mount, actor: { id } });

  it("actor: admits the outside account whose mount and id the instance holds, listed, for its own superagent, and no one else", async () => {
    const fields = { account: Account.fields.id, superagent: Account.fields.superagent };
    const allowed = [listed.of("account")] as never;
    const call = (account: string, superagent = "sag_1") => ({ account, superagent });
    expect(Exit.isSuccess(await run(allowed, fields, call("acc_1"), sender("583231")))).toBe(true);
    expect(Exit.isFailure(await run(allowed, fields, call("acc_1"), sender("999")))).toBe(true);         // another account's id
    expect(Exit.isFailure(await run(allowed, fields, call("acc_1"), sender("583231", "slack")))).toBe(true); // the same id on another connection
    expect(Exit.isFailure(await run(allowed, fields, call("acc_2"), sender("999")))).toBe(true);         // seen, not listed
    expect(Exit.isFailure(await run(allowed, fields, call("acc_1", "sag_2"), sender("583231")))).toBe(true); // another superagent's call
    expect(Exit.isFailure(await run(allowed, fields, call("acc_1"), { kind: "service", mount: "github" }))).toBe(true); // a service with no sender
    expect(Exit.isFailure(await run(allowed, fields, call("acc_1"), ada))).toBe(true);                   // never a person
    expect(Exit.isFailure(await run(allowed, fields, call("acc_1"), { kind: "system" }))).toBe(true);    // never the system
  });

  it("agent: admits the agent whose id the field holds, acting as itself, and never a person or another agent", async () => {
    const fields = { claim: Claim.fields.id };
    const allowed = [itsAgent] as never;
    expect(Exit.isSuccess(await run(allowed, fields, { claim: "clm_1" }, { kind: "agent", agent: "agt_main", via: "agent" }))).toBe(true);
    expect(Exit.isFailure(await run(allowed, fields, { claim: "clm_1" }, { kind: "agent", agent: "agt_other", via: "agent" }))).toBe(true);
    expect(Exit.isFailure(await run(allowed, fields, { claim: "clm_1" }, { kind: "agent", person: "agt_main", via: "agent" }))).toBe(true); // an agent for a person
    expect(Exit.isFailure(await run(allowed, fields, { claim: "clm_1" }, ada))).toBe(true);
    expect(Exit.isFailure(await run([Blueprint.signedIn] as never, {}, {}, { kind: "agent", agent: "agt_main", via: "agent" }))).toBe(true);   // signedIn is for hands: an agent as itself has none
  });
});
