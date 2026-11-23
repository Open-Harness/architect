// S-31 (design/decisions/S31-breaks.md): the wire keeps what the model carries on each operation, `breaks`, the full names of every rule the operation can
// break, with a refusal or without. `Wire.decode` drops what its schema does not name, and the portal's rules stop reads the decoded wire, so a schema
// without `breaks` leaves a refuse-less rule out of the stop (the snag). Written by the checks author; the builder never edits this file.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Wire } from "./service.ts";
import { acmeModel, blueprintOf } from "./testing.ts";
import type { ModelWire } from "./types.ts";

const withBreaks = (breaks: ReadonlyArray<string>): ModelWire => {
  const model = acmeModel();
  return { ...model, operations: { ...model.operations, "allowance.spend": { ...model.operations["allowance.spend"]!, breaks, hash: "with-breaks" } as never } };
};
// An older wire: every operation without `breaks`, built from a copy so the controls hold whether or not acme's committed model carries the key.
const olderWire = (): ModelWire => {
  const model = acmeModel();
  return { ...model, operations: Object.fromEntries(Object.entries(model.operations).map(([name, operation]) => {
    const { breaks: _, ...older } = operation as typeof operation & { breaks?: unknown }; // the model type names `breaks` only after the S-31 build
    return [name, older];
  })) as never };
};
const roundTrip = (model: ModelWire) => Effect.runPromise(Wire.decode(JSON.parse(JSON.stringify(blueprintOf(model)))));

describe("S-31 control: an operation with no rules to break", () => {
  it("round-trips without `breaks`, and the wire built from the model is the same wire as before", async () => {
    const decoded = await roundTrip(olderWire());
    expect(decoded.model.operations["allowance.spend"]).not.toHaveProperty("breaks");
  });
});

describe("S-31: the wire keeps `breaks`", () => {
  it("decoding keeps an operation's list, whole and in order, including a rule that owns no refusal", async () => {
    const breaks = ["profile.onePagePerHandle", "allowance.oneHolderPerName"]; // not sorted: the wire keeps what the compiler wrote, in its order
    const decoded = await roundTrip(withBreaks(breaks));
    expect((decoded.model.operations["allowance.spend"] as unknown as { breaks?: ReadonlyArray<string> }).breaks).toEqual(breaks);
  });

  it("an empty list stays an empty list (not absent), and an operation that never had one stays without", async () => {
    const decoded = await roundTrip(withBreaks([]));
    expect((decoded.model.operations["allowance.spend"] as unknown as { breaks?: ReadonlyArray<string> }).breaks).toEqual([]);
    const older = await roundTrip({ ...olderWire(), operations: { ...olderWire().operations, "allowance.spend": withBreaks([]).operations["allowance.spend"]! } });
    expect(older.model.operations["allowance.grant"]).not.toHaveProperty("breaks");
  });

  it("the digest depends on it: two wires that differ only in what an operation breaks are two wires", () => {
    expect(blueprintOf(withBreaks(["allowance.a"])).digest).not.toBe(blueprintOf(withBreaks(["allowance.b"])).digest);
    expect(blueprintOf(withBreaks(["allowance.a"])).digest).not.toBe(blueprintOf().digest);
  });

  it("decoding refuses a `breaks` that is not a list of names (the wire is re-signed, so only the schema can refuse it)", async () => {
    const { digest: _, ...unsigned } = JSON.parse(JSON.stringify(blueprintOf(withBreaks(["allowance.a"])))) as { digest: string; model: { operations: Record<string, { breaks: unknown }> } };
    unsigned.model.operations["allowance.spend"]!.breaks = "allowance.a";
    const result = await Effect.runPromise(Effect.result(Wire.decode({ ...unsigned, digest: Wire.digestOf(unsigned as never) })));
    expect(result._tag).toBe("Failure");
    const numbers = structuredClone(unsigned);
    numbers.model.operations["allowance.spend"]!.breaks = [1];
    expect((await Effect.runPromise(Effect.result(Wire.decode({ ...numbers, digest: Wire.digestOf(numbers as never) })))) ._tag).toBe("Failure");
    for (const wrong of [null, {}, ["allowance.a", null]]) {
      const other = structuredClone(unsigned);
      other.model.operations["allowance.spend"]!.breaks = wrong;
      expect((await Effect.runPromise(Effect.result(Wire.decode({ ...other, digest: Wire.digestOf(other as never) })))) ._tag, `a \`breaks\` of ${JSON.stringify(wrong)}`).toBe("Failure");
    }
  });
});
