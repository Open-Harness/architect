// #466: `needsApproval?: true` on OperationSpec. Present on the declared operation only; `true` is the one value the type takes.
// The type is judged by the compiler itself (tsc over scratch files), so this file typechecks today and goes green with the build.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Values } from "#modules/values/service.js";
import { Things } from "#modules/things/service.js";
import { Roles } from "#modules/roles/service.js";
import { Operations } from "./service.ts";

const Handle = Things.thing({ description: "x", fields: { id: Values.id("han"), owner: Values.id("per") } });
const owner = Roles.role(Handle, { rule: (h, p) => h.owner === p.person });
const base = {
  description: "Release.",
  payload: { handle: Handle.fields.id },
  answer: {},
  allowed: [owner.of("handle")] as const,
  steps: { record: Operations.step.database() },
};

describe("needsApproval on an operation", () => {
  it("is kept on the operation when declared `true`", () => {
    const asked = Operations.operation(Handle, { ...base, needsApproval: true } as never) as unknown as { readonly needsApproval?: unknown };
    expect(asked.needsApproval).toBe(true);
  });

  it("is absent, not `false` or `undefined`, when not declared: the operation has no such key at all", () => {
    const asked = Operations.operation(Handle, { ...base, needsApproval: true } as never);
    const plain = Operations.operation(Handle, base as never);
    expect(Object.keys(plain)).not.toContain("needsApproval");
    expect("needsApproval" in plain).toBe(false);
    // Declaring it adds exactly that one key to what the front door makes: nothing else on the operation moves.
    expect(Object.keys(asked).filter((k) => !Object.keys(plain).includes(k))).toEqual(["needsApproval"]);
    expect(Object.keys(plain).filter((k) => !Object.keys(asked).includes(k))).toEqual([]);
  });
});

// The type: tsc over a scratch project that imports the front door. One run, shared by the cases.
const scratch = resolve(import.meta.dirname, "../../../.ortho/needs-approval-types");
const cases = {
  "declares-true": "needsApproval: true,",
  "declares-false": "needsApproval: false,",
  "declares-text": 'needsApproval: "yes",',
  "declares-number": "needsApproval: 1,",
  "declares-null": "needsApproval: null,",
  "declares-nothing": "",
} as const;
let diagnostics: string | undefined;
const diagnosticsOf = (): string => {
  if (diagnostics !== undefined) return diagnostics;
  mkdirSync(scratch, { recursive: true });
  const src = resolve(import.meta.dirname, "../../index.ts");
  for (const [name, line] of Object.entries(cases)) {
    writeFileSync(join(scratch, `${name}.ts`), `import { Blueprint } from ${JSON.stringify(src)};
const Handle = Blueprint.thing({ description: "x", fields: { id: Blueprint.id("han") } });
const owner = Blueprint.role(Handle, { rule: (h, p) => h.id === p.person });
export default Blueprint.operation(Handle, {
  description: "x",
  payload: { handle: Handle.fields.id },
  answer: {},
  allowed: [owner.of("handle")],
  steps: { record: Blueprint.step.database() },
  ${line}
});
`);
  }
  writeFileSync(join(scratch, "tsconfig.json"), JSON.stringify({ extends: resolve(import.meta.dirname, "../../../../../tsconfig.base.json"), include: ["./*.ts"] }));
  const tsc = resolve(import.meta.dirname, "../../../../../node_modules/.bin/tsc");
  try {
    execFileSync(tsc, ["-p", join(scratch, "tsconfig.json"), "--pretty", "false"], { encoding: "utf8", stdio: "pipe" });
    diagnostics = "";
  } catch (e) {
    // tsc exits 1 or 2 when it reports diagnostics; anything else (not found, a crash) is not an answer, and must not read as "no errors".
    if (![1, 2].includes((e as { status?: number }).status ?? -1)) throw e;
    diagnostics = String((e as { stdout?: string }).stdout);
  }
  return diagnostics;
};
const errorsIn = (name: string) => diagnosticsOf().split("\n").filter((l) => l.includes(`/${name}.ts(`));

describe("needsApproval's type", () => {
  afterAll(() => rmSync(scratch, { recursive: true, force: true }));

  it("takes `true`, and an operation that leaves it out still compiles", () => {
    expect(errorsIn("declares-true")).toEqual([]);
    expect(errorsIn("declares-nothing")).toEqual([]);
  }, 60_000);

  it.each(["declares-false", "declares-text", "declares-number", "declares-null"])("refuses %s: the type is `true`, and absence says no", (name) => {
    const errors = errorsIn(name);
    expect(errors.length).toBeGreaterThan(0);
    // The reason is the value against `true`, not an unknown property.
    expect(errors.join("\n")).toMatch(/is not assignable to type 'true'/);
  }, 60_000);
});
