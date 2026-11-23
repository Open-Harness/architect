// Stores in the model (K3, M1.17): declared by path, lived in by name, one per commit, bound by environments, brought by a mount.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { BlueprintInvalid } from "./types.ts";
import { Compiler } from "./service.ts";

// Under the package, so `orthograph` resolves from the temporary projects the way a project's own imports do.
const scratch = resolve(import.meta.dirname, "../../../.ortho/stores");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const put = (root: string, files: Readonly<Record<string, string>>) => {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
};
const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
const problemsOf = (exit: Exit.Exit<unknown, unknown>): ReadonlyArray<string> => {
  expect(Exit.isFailure(exit)).toBe(true);
  const error = Exit.isFailure(exit) ? exit.cause.reasons.map((r) => (r as { error?: unknown }).error).find((e) => e instanceof BlueprintInvalid) : undefined;
  return error instanceof BlueprintInvalid ? error.problems : [];
};

const THING = (lives: string, imports = "") => `import { Blueprint } from "orthograph";\n${imports}
export const Entry = Blueprint.thing({ description: "A line.", fields: { id: Blueprint.id("ent") }${lives ? `, lives: ${lives}` : ""}, code: "EN" });\n`;
const OTHER = `import { Blueprint } from "orthograph";
export const Note = Blueprint.thing({ description: "A note.", fields: { id: Blueprint.id("not") }, code: "NO" });\n`;
const STORE = (kind: string) => `import { Blueprint } from "orthograph";\nexport default Blueprint.store.${kind};\n`;
const OPERATION = (thing: string, imports: string, spec: string) => `import { Blueprint } from "orthograph";\nimport { ${thing} } from "../thing.ts";\n${imports}
export default Blueprint.operation(${thing}, { description: "Do it.", payload: {}, answer: {}, allowed: [Blueprint.anyone], ${spec} });\n`;

let n = 0;
const project = (files: Readonly<Record<string, string>>): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, `p${n++}-`));
  put(root, Object.fromEntries(Object.entries(files).map(([p, t]) => [`blueprint/${p}`, t])));
  return root;
};

describe("stores in the model", () => {
  it("a thing that lives in a declared store is named by the store's file; one that doesn't lives in the default", async () => {
    const root = project({
      "stores/ledger.ts": STORE("database()"),
      "things/entry/thing.ts": THING("ledger", `import ledger from "../../stores/ledger.ts";`),
      "things/note/thing.ts": OTHER,
    });
    const exit = await modelOf(root);
    expect(problemsOf(Exit.isFailure(exit) ? exit : Exit.fail("none"))).toEqual([]);
    if (!Exit.isSuccess(exit)) return;
    expect(exit.value.stores).toMatchObject({ ledger: { name: "ledger", file: "blueprint/stores/ledger.ts", kind: "database" } });
    expect(exit.value.things["entry"]).toMatchObject({ lives: "database", store: "ledger" });
    expect(exit.value.things["note"]).not.toHaveProperty("store");
    // Living in a store is part of the thing's hash: moving a thing between stores is a change.
    const plain = await modelOf(project({ "things/entry/thing.ts": THING("") }));
    expect(Exit.isSuccess(plain) && plain.value.things["entry"]?.hash).not.toBe(exit.value.things["entry"]?.hash);
  });

  it("a project with no store has none in its model", async () => {
    const exit = await modelOf(project({ "things/note/thing.ts": OTHER }));
    expect(Exit.isSuccess(exit) && "stores" in exit.value).toBe(false);
  });

  it("refuses a kind no host supplies, and a thing that lives in a store that isn't a stores/ file", async () => {
    const chain = await modelOf(project({ "stores/vault.ts": STORE(`kind("chain")`) }));
    expect(problemsOf(chain)).toEqual([`blueprint/stores/vault.ts: a store of kind "chain", which no host of this project supplies (they supply database and actor and chain.evm)`]);
    const loose = await modelOf(project({ "things/entry/thing.ts": THING("Blueprint.store.database()") }));
    expect(problemsOf(loose)).toEqual(["blueprint/things/entry/thing.ts: lives in a store that isn't a default export of a stores/<name>.ts"]);
    const wrong = await modelOf(project({ "stores/ledger.ts": `export default { kind: "thing" };\n` }));
    expect(problemsOf(wrong)).toEqual(["blueprint/stores/ledger.ts: the default export must be a Blueprint.store.<kind>()"]);
  });

  it("an operation writing two stores fails to compile, whichever way it does", async () => {
    const files = {
      "stores/ledger.ts": STORE("database()"),
      "things/entry/thing.ts": THING("ledger", `import ledger from "../../stores/ledger.ts";`),
      "things/note/thing.ts": OTHER,
    };
    const via = (ops: Readonly<Record<string, string>>) => modelOf(project({ ...files, ...ops }));
    // Its own thing is in the ledger; a step writes a note, which is in the default store.
    const step = await via({
      "things/entry/verbs/both.ts": OPERATION("Entry", `import { Note } from "../../note/thing.ts";`, "steps: { save: Blueprint.step.database(), log: Blueprint.step.database({ writes: [Note] }) },"),
    });
    expect(problemsOf(step)).toEqual(["blueprint/things/entry/verbs/both.ts: entry.both writes to two stores (store ledger by step save; the default store by step log (note)): one call commits to one store, so run work across stores as a workflow"]);
    // Naming both in one step is the same refusal.
    const both = await via({
      "things/entry/verbs/two.ts": OPERATION("Entry", `import { Note } from "../../note/thing.ts";`, "steps: { save: Blueprint.step.database({ writes: [Entry, Note] }) },"),
    });
    expect(problemsOf(both)[0]).toMatch(/^blueprint\/things\/entry\/verbs\/two\.ts: entry\.two writes to two stores \(store ledger by step save \(entry\); the default store by step save \(note\)\)/);
    // One store is fine, and so is a step that writes only another thing of the same store.
    const fine = await via({
      "things/entry/verbs/one.ts": OPERATION("Entry", "", "steps: { save: Blueprint.step.database() },"),
      "things/entry/verbs/same.ts": OPERATION("Entry", "", "steps: { save: Blueprint.step.database({ writes: [Entry] }) },"),
    });
    expect(Exit.isSuccess(fine)).toBe(true);
    if (Exit.isSuccess(fine)) expect(fine.value.operations["entry.same"]?.steps).toEqual({ save: { name: "entry.same.save", type: "database", writes: ["entry"] } });
  });

  it("an environment binds only declared database stores; a misspelt one is refused", async () => {
    const env = (stores: string) => `import { Blueprint, Cloud } from "orthograph";
export default Blueprint.environment({ runs: "on this machine", identity: { kind: "identity", which: "test-principals" } as never, ${stores} });\n`;
    const files = { "stores/ledger.ts": STORE("database()"), "stores/rooms.ts": STORE("actor()"), "things/entry/thing.ts": THING("ledger", `import ledger from "../../stores/ledger.ts";`) };
    const ok = await modelOf(project({ ...files, "environments/local.ts": env("stores: { ledger: Cloud.d1.local() }") }));
    expect(Exit.isSuccess(ok) && ok.value.environments?.["local"]?.stores).toEqual({ ledger: "d1-local" });
    const misspelt = await modelOf(project({ ...files, "environments/local.ts": env("stores: { ledgr: Cloud.d1.local() }") }));
    expect(problemsOf(misspelt)).toEqual([`blueprint/environments/local.ts: stores binds "ledgr", which isn't a declared store (the stores are ledger, rooms)`]);
    const actor = await modelOf(project({ ...files, "environments/local.ts": env("stores: { rooms: Cloud.d1.local() }") }));
    expect(problemsOf(actor)).toEqual([`blueprint/environments/local.ts: stores binds "rooms", a actor store, to a database: only a database store is bound this way`]);
  });
});

/** A feature package written by hand into a project's node_modules, as `npm pack` would leave it. */
const installLedger = (root: string, version = "1.0.0") => {
  const base = "node_modules/@fixture/vault";
  put(root, {
    "package.json": JSON.stringify({ name: "app", version: "0.0.0", type: "module", dependencies: { "@fixture/vault": version } }),
    [`${base}/package.json`]: JSON.stringify({ name: "@fixture/vault", version, type: "module", exports: { ".": "./feature.js" }, orthograph: { kind: "feature", blueprint: "./blueprint" } }),
    [`${base}/feature.js`]: `import { Blueprint } from "orthograph";\nexport default Blueprint.feature({ description: "Keeps lines." });\n`,
    [`${base}/blueprint/stores/ledger.js`]: `import { Blueprint } from "orthograph";\nexport default Blueprint.store.database();\n`,
    [`${base}/blueprint/things/line/thing.js`]: `import { Blueprint } from "orthograph";\nimport ledger from "../../stores/ledger.js";\nexport const Line = Blueprint.thing({ description: "A line.", fields: { id: Blueprint.id("lin") }, lives: ledger, code: "LI" });\n`,
    [`${base}/blueprint/things/line/verbs/add.js`]: `import { Blueprint } from "orthograph";\nimport { Line } from "../thing.js";\nexport default Blueprint.operation(Line, { description: "Add a line.", payload: {}, answer: {}, allowed: [Blueprint.anyone], steps: { save: Blueprint.step.database() } });\n`,
  });
};

describe("a feature's own stores", () => {
  it("mounts beside the project's default, named by the mount and the store's path", async () => {
    const root = project({
      "things/note/thing.ts": OTHER,
      "features/vault.ts": `import { Blueprint } from "orthograph";\nimport vault from "@fixture/vault";\nexport default Blueprint.use(vault);\n`,
    });
    installLedger(root);
    const exit = await modelOf(root);
    expect(problemsOf(Exit.isFailure(exit) ? exit : Exit.fail("none"))).toEqual([]);
    if (!Exit.isSuccess(exit)) return;
    expect(exit.value.stores).toMatchObject({
      "vault-ledger": { name: "vault-ledger", kind: "database", file: "@fixture/vault/blueprint/stores/ledger.js", from: { mount: "vault", package: "@fixture/vault", version: "1.0.0", store: "ledger" } },
    });
    expect(exit.value.things["line"]).toMatchObject({ lives: "database", store: "vault-ledger", from: { thing: "line" } });
    expect(exit.value.things["note"]).not.toHaveProperty("store");
    expect(exit.value.operations["line.add"]?.steps).toEqual({ save: { name: "line.add.save", type: "database" } });
    // The same store, mounted under another name, is another store: nothing collides.
    const again = project({ "features/ledgerbook.ts": `import { Blueprint } from "orthograph";\nimport vault from "@fixture/vault";\nexport default Blueprint.use(vault);\n` });
    installLedger(again);
    const other = await modelOf(again);
    expect(Exit.isSuccess(other) && Object.keys(other.value.stores ?? {})).toEqual(["ledgerbook-ledger"]);
  });

  it("is refused when the project already has a store by the name the mount gives it", async () => {
    const root = project({
      "stores/vault-ledger.ts": STORE("database()"),
      "features/vault.ts": `import { Blueprint } from "orthograph";\nimport vault from "@fixture/vault";\nexport default Blueprint.use(vault);\n`,
    });
    installLedger(root);
    expect(problemsOf(await modelOf(root))[0]).toBe("blueprint/features/vault.ts: @fixture/vault brings store vault-ledger, and the blueprint has one by that name, blueprint/stores/vault-ledger.ts: mount it under another name");
  });
});
