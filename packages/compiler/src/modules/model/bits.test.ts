// A uint or money width that is no whole number from 1 to 256 is a typed refusal on a database store, naming the file and the field,
// never a RangeError while the blueprint loads. 12 is a width a database may hold (only a chain needs a multiple of 8).
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

const scratch = resolve(import.meta.dirname, "../../../test/tmp/bits");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

let n = 0;
const project = (spec: string): string => {
  const root = join(scratch, `p${n++}`);
  const files: Record<string, string> = {
    "blueprint/assets/eur.ts": `import { Blueprint } from "orthograph";\nexport default Blueprint.asset.currency("EUR");\n`,
    "blueprint/things/invoice/thing.ts": `import { Blueprint } from "orthograph";
import eur from "../../assets/eur.ts";
export const Invoice = Blueprint.thing({ description: "An amount owed.", code: "IV", fields: { id: Blueprint.id("inv"), odd: ${spec} } });
void eur;
`,
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
};
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
const problems = (exit: Exit.Exit<unknown, unknown>): string =>
  Exit.isFailure(exit) ? JSON.stringify(exit.cause) : "";

describe("a width that is no whole number from 1 to 256", () => {
  for (const [label, bits] of [["NaN", "Number.NaN"], ["1.5", "1.5"], ["Infinity", "Number.POSITIVE_INFINITY"], ["0", "0"], ["4096", "4096"]] as const) {
    for (const spec of [`Blueprint.uint(${bits})`, `Blueprint.money(eur, { bits: ${bits} })`]) {
      it(`${spec} is refused, naming the file and the field (${label})`, async () => {
        const said = problems(await modelOf(project(spec)));
        expect(said).toContain("blueprint/things/invoice/thing.ts field odd");
        expect(said).toContain("is no width");
      });
    }
  }

  it("12 compiles on a database store, as uint and as money", async () => {
    for (const spec of ["Blueprint.uint(12)", "Blueprint.money(eur, { bits: 12 })"]) expect(Exit.isSuccess(await modelOf(project(spec))), spec).toBe(true);
  });
});
