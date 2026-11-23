// A read the runtime does not serve yet refuses ReadNotServed: the contract has a wire class for it, so a door answers with a typed
// refusal (HTTP 501) and not a defect. A model with no such refusal generates exactly what it did.
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { api } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), acme], { encoding: "utf8" })) as Model;
const errorsOf = async (m: Model) => (await Effect.runPromise(api.render({ name: "acme", model: m, mount: "api", mounts: m.mounts ?? {} }))).find((f) => f.path === "src/errors.ts")!.content;

describe("ReadNotServed in the contract", () => {
  it("has a wire class, a row with its code and 501, and is in `wire`, when the model has the refusal", async () => {
    const text = await errorsOf({ ...model, refusals: { ...model.refusals, ReadNotServed: "AR-008" } });
    expect(text).toContain('ReadNotServed: { code: "AR-008", exit: 121, status: 501 }');
    expect(text).toMatch(/export class ReadNotServed extends Schema\.TaggedError<ReadNotServed>\(\)\("ReadNotServed"/);
    expect(text).toMatch(/export const wire = \{[^}]*ReadNotServed/);
  });

  it("has nothing of it when the model does not", async () => {
    expect(await errorsOf(model)).not.toContain("ReadNotServed");
  });
});
