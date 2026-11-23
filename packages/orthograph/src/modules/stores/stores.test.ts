import { describe, expect, it } from "vitest";
import { Values } from "#modules/values/service.js";
import { Things } from "#modules/things/service.js";
import { Operations } from "#modules/operations/service.js";
import { Stores } from "./service.ts";

describe("stores", () => {
  it("are frozen data with a kind, and the kinds are open", () => {
    expect(Stores.store.database()).toEqual({ kind: "store", of: "database" });
    expect(Stores.store.actor().of).toBe("actor");
    expect(Stores.store.kind("chain").of).toBe("chain");
    expect(Object.isFrozen(Stores.store.database())).toBe(true);
  });

  it("a thing that lives in a store keeps the store, and its `lives` is the store's kind", () => {
    const ledger = Stores.store.database();
    const Entry = Things.thing({ description: "A line.", fields: { id: Values.id("ent") }, lives: ledger });
    expect(Entry.lives).toBe("database");
    expect(Entry.store).toBe(ledger);
    const Plain = Things.thing({ description: "A thing.", fields: { id: Values.id("pln") } });
    expect(Plain.store).toBeUndefined();
    expect(Things.thing({ description: "An actor.", fields: { id: Values.id("act") }, lives: Stores.store.actor() }).lives).toBe("actor");
    expect(Things.thing({ description: "An actor.", fields: { id: Values.id("act") }, lives: "actor" }).store).toBeUndefined();
  });

  it("a database step may name the things it writes", () => {
    const Entry = Things.thing({ description: "A line.", fields: { id: Values.id("ent") } });
    expect(Operations.step.database()).toEqual({ kind: "step", type: "database" });
    expect(Operations.step.database({ writes: [Entry] }).writes).toEqual([Entry]);
  });
});
