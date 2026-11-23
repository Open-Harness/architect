// L2.10a: the wire projection is versioned and deterministic, and the decoder rejects what it does not know.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Wire } from "./service.ts";
import { acmeDocs, acmeModel, blueprintOf, withBudget } from "./testing.ts";
import type { ModelWire } from "./types.ts";

const decode = (json: unknown) => Effect.runPromise(Effect.result(Wire.decode(json)));

describe("the blueprint wire", () => {
  it("is deterministic: the same model and docs give byte-identical JSON, whatever order the docs arrive in", () => {
    const a = JSON.stringify(blueprintOf());
    const reversed = Object.fromEntries(Object.entries(acmeDocs()).reverse());
    const b = JSON.stringify(Wire.build({ project: "acme", model: acmeModel(), docs: reversed }));
    expect(b).toBe(a);
  });

  it("is version 1, carries no revision and no clock, and names the model it was made from by digest", () => {
    const wire = blueprintOf();
    expect(wire).toMatchObject({ schemaVersion: 1, project: "acme", revision: null });
    expect(wire.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(wire)).not.toMatch(/20\d\d-\d\d-\d\dT/);
    expect(Object.keys(wire.model.operations)).toContain("allowance.spend");
    expect(wire.docs["allowance/spend.md"]).toContain("# allowance.spend");
    expect(wire.extensions).toMatchObject({ journeys: { state: "unavailable" }, evals: { state: "unavailable" }, traces: { state: "unavailable" } });
  });

  it("changes its digest when the model changes, and only then", () => {
    expect(blueprintOf().digest).toBe(blueprintOf().digest);
    expect(blueprintOf(withBudget(acmeModel(), "allowance.spend", 120)).digest).not.toBe(blueprintOf().digest);
  });

  it("decodes what it built", async () => {
    const wire = blueprintOf();
    const decoded = await decode(JSON.parse(JSON.stringify(wire)));
    expect(decoded._tag, JSON.stringify(decoded)).toBe("Success");
  });

  it("carries a thing's rules and the refusals an operation makes for them, and decoding keeps both (G5)", async () => {
    const model = acmeModel();
    const rule = { kind: "unique" as const, fields: ["name"], while: ["open"], refuse: "AllowanceTaken", description: "that name is taken" };
    const ruled: ModelWire = {
      ...model,
      things: { ...model.things, allowance: { ...model.things["allowance"]!, invariants: { oneHolderPerName: rule }, hash: "with-a-rule" } },
      operations: { ...model.operations, "allowance.spend": { ...model.operations["allowance.spend"]!, invariants: { AllowanceTaken: "allowance.oneHolderPerName" }, hash: "with-its-refusal" } },
    };
    const wire = blueprintOf(ruled);
    expect(wire.digest).not.toBe(blueprintOf().digest);
    const decoded = await Effect.runPromise(Wire.decode(JSON.parse(JSON.stringify(wire))));
    expect(decoded.model.things["allowance"]?.invariants).toEqual({ oneHolderPerName: rule });
    expect(decoded.model.operations["allowance.spend"]?.invariants).toEqual({ AllowanceTaken: "allowance.oneHolderPerName" });
    expect(decoded.model.things["person"]).not.toHaveProperty("invariants");
  });

  it("rejects an unknown schema version, naming it", async () => {
    const result = await decode({ ...blueprintOf(), schemaVersion: 2 });
    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "BlueprintRejected", reason: expect.stringContaining("schema version 2") } });
  });

  it("rejects a digest that is not the content's, and a blueprint edited after it was made", async () => {
    const wire = JSON.parse(JSON.stringify(blueprintOf())) as ReturnType<typeof blueprintOf>;
    expect(await decode({ ...wire, digest: "0".repeat(64) })).toMatchObject({ _tag: "Failure", failure: { reason: expect.stringContaining("digest") } });
    const edited = { ...wire, project: "elsewhere" };
    expect(await decode(edited)).toMatchObject({ _tag: "Failure", failure: { reason: expect.stringContaining("digest") } });
  });

  it("rejects what is not a blueprint at all", async () => {
    for (const junk of [null, 7, "x", {}, { schemaVersion: 1 }]) expect((await decode(junk))._tag).toBe("Failure");
  });

  it("ignores an extension key it does not know, when the digest still holds", async () => {
    const wire = JSON.parse(JSON.stringify(blueprintOf())) as { digest: string; extensions: Record<string, unknown> } & Record<string, unknown>;
    const { digest: _digest, ...unsigned } = wire;
    const extended = { ...unsigned, extensions: { ...wire.extensions, ratchets: { state: "unavailable", reason: "later" } } };
    expect((await decode({ ...extended, digest: Wire.digestOf(extended) }))._tag).toBe("Success");
  });
});

describe("a proof's dependencies, from the model's JSON alone", () => {
  it("are the operation, its thing and the things its fields and roles refer to", () => {
    const core = Effect.runSync(Wire.core(acmeModel()));
    expect(Wire.dependsOn(core, "allowance.spend")).toEqual({
      "operation:allowance.spend": acmeModel().operations["allowance.spend"]!.hash,
      "thing:allowance": acmeModel().things["allowance"]!.hash,
      "thing:organization": acmeModel().things["organization"]!.hash,
      "thing:person": acmeModel().things["person"]!.hash,
    });
    expect(Wire.dependsOn(core, "nothing.here")).toEqual({});
  });

  it("are recorded in the blueprint for every operation, equal to what the adapter works out", () => {
    const wire = blueprintOf();
    const core = Effect.runSync(Wire.core(wire.model));
    for (const name of Object.keys(wire.model.operations)) expect(wire.dependsOnByOperation[name]).toEqual(Wire.dependsOn(core, name));
  });

  it("give hashOf for a key, and undefined for one that is gone", () => {
    const core = Effect.runSync(Wire.core(acmeModel()));
    expect(Wire.hashOf(core, "thing:allowance")).toBe(acmeModel().things["allowance"]!.hash);
    expect(Wire.hashOf(core, "thing:nope")).toBeUndefined();
    expect(Wire.hashOf(core, "operation:allowance.nope")).toBeUndefined();
  });

  it("refuse a model shape they do not know (unavailable, never guessed)", async () => {
    expect((await Effect.runPromise(Effect.result(Wire.core({ operations: 3 })))) ._tag).toBe("Failure");
    expect((await Effect.runPromise(Effect.result(Wire.core(null))))._tag).toBe("Failure");
  });
});

describe("what the compiler writes is what the decoder keeps (M1.13)", () => {
  it("keeps Plugged In's refusals, events, errors, journeys, starting worlds, environments and mounts exactly", async () => {
    const file = join(resolve(import.meta.dirname, "../../../../.."), "examples/plugged-in/generated/portal/blueprint.json");
    const raw = JSON.parse(readFileSync(file, "utf8")) as { model: Record<string, any> };
    const model = (await Effect.runPromise(Wire.decode(raw))).model as unknown as Record<string, any>;
    for (const key of ["refusals", "journeys", "startingWorlds", "mounts"]) expect(model[key], key).toEqual(raw.model[key]);
    expect(model["things"]["handle"]).toMatchObject({ code: "HN", events: raw.model["things"]["handle"].events, errors: raw.model["things"]["handle"].errors });
    for (const [name, env] of Object.entries(raw.model["environments"] as Record<string, any>)) {
      expect(model["environments"][name], name).toEqual(env);
    }
    expect(model["operations"]["handle.claim"]).toMatchObject({ test: "unit", runs: "server", from: { kind: "app" } });
  });

  it("decodes a journey step the compiler skipped (its operation is outside the model): a title and why, no call and no checks", async () => {
    const file = join(resolve(import.meta.dirname, "../../../../.."), "examples/plugged-in/generated/portal/blueprint.json");
    const { digest: _, ...unsigned } = JSON.parse(readFileSync(file, "utf8")) as { model: { journeys: Record<string, { steps: Array<unknown> }> }; digest: string };
    const first = Object.values(unsigned.model.journeys)[0]!;
    first.steps.push({ title: "a step of an operation the model lacks", skipped: "operation is outside the model" });
    const wire = await Effect.runPromise(Wire.decode({ ...unsigned, digest: Wire.digestOf(unsigned) }));
    const steps = Object.values((wire.model as unknown as { journeys: Record<string, { steps: ReadonlyArray<unknown> }> }).journeys)[0]!.steps;
    expect(steps[steps.length - 1]).toEqual({ title: "a step of an operation the model lacks", skipped: "operation is outside the model" });
  });
});
