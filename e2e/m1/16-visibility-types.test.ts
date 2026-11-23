// Check 16, the types of the SDK (M1.35 review, P2). The server cuts every answer by who is asking, so a field that is private
// or secret may be missing from what the SDK decodes. The SDK's response type must say so: those fields optional, in the
// answer and in each item of a list. Read through tsc over the generated SDK of the locker fixture plus one list read of it.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { nothingRunning, succeeds } from "./support.ts";
import { overlay, plant } from "./visibility.ts";

const copy = overlay(plant());
afterAll(() => { nothingRunning(copy.root); copy.remove(); });

const listFile = `import { Blueprint } from "orthograph";
import { Locker } from "../thing.ts";

// A list read of the lockers: its items are the thing's own fields, a private and a secret one among them.
export default Blueprint.read(Locker, { where: ["state"], order: "oldest", page: 10, allowed: [Blueprint.anyone] });
`;

const program = `import type { Effect } from "effect";
import * as Sdk from "../../generated/sdk/src/index.ts";

type Success<F extends (...args: never) => Effect.Effect<unknown, unknown, unknown>> = Effect.Success<ReturnType<F>>;
/** true when \`K\` may be missing from \`T\`: the field is optional. */
type Optional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;

type Got = Success<typeof Sdk.locker.get>;
type Item = Success<typeof Sdk.locker.list>["items"][number];

export const getNote: Optional<Got, "note"> = true;
export const getCode: Optional<Got, "code"> = true;
export const getLabel: Optional<Got, "label"> = false;
export const itemNote: Optional<Item, "note"> = true;
export const itemCode: Optional<Item, "code"> = true;
export const itemLabel: Optional<Item, "label"> = false;
`;

describe("16 types: the SDK's response type is the wire shape", () => {
  it("a private or secret answer field is optional in a read's response and inside a list item; a public field stays required", () => {
    mkdirSync(join(copy.root, "blueprint/things/locker/verbs"), { recursive: true });
    writeFileSync(join(copy.root, "blueprint/things/locker/verbs/list.ts"), listFile);
    succeeds(copy.root, "generate");
    const dir = join(copy.root, ".ortho/sdk-types");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "main.ts"), program);
    writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ extends: join(copy.root, "tsconfig.json"), compilerOptions: { types: [], lib: ["es2024", "dom", "dom.iterable"], noEmit: true }, include: ["main.ts"] }));
    const checked = spawnSync(join(copy.root, "node_modules/.bin/tsc"), ["-p", join(dir, "tsconfig.json"), "--pretty", "false"], { cwd: copy.root, encoding: "utf8", timeout: 240_000 });
    const lines = program.split("\n");
    // Each failing line is `export const <name>: Optional<...> = <want>`: say which field and what the SDK's type got wrong.
    const errors = (checked.stdout + checked.stderr).split("\n").flatMap((line) => {
      const at = /main\.ts\((\d+),/.exec(line);
      const source = at ? lines[Number(at[1]) - 1] ?? "" : "";
      const [, name = "", field = "", want = ""] = /export const (\w+): Optional<\w+, "(\w+)"> = (\w+)/.exec(source) ?? [];
      return at ? [`${name}: "${field}" should be ${want === "true" ? "optional" : "required"} in the SDK's type`] : [];
    });
    expect(errors, "each line is a field the SDK types as required that the server may leave out (or one it types as optional that is public)").toEqual([]);
    expect(checked.status).toBe(0);
  }, 400_000);
});
