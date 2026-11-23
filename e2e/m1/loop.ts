// What check 20 shares (M1.41): a fresh folder made from an example, the compiled model it is judged against, and one reader
// per cell of K13's grid. Each reader returns what is wrong (an empty list is a pass), so the same reader runs on acme (a
// control: true today) and on Plugged In. Nothing here names a literal value: every name, code, exit and description comes
// out of `generated/model/model.json`.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { copyOf, repo } from "../layer1/support.ts";
import { exportsOf } from "./clients.ts";
import { succeeds, textAt, tree } from "./support.ts";

export const pluggedIn = join(repo, "examples/plugged-in");
export const MISSING = "examples/plugged-in does not exist yet (M1.40)";

export interface Field { readonly value: { readonly type: string; readonly bits?: number; readonly prefix?: string }; readonly named?: string; readonly ref?: string; readonly visibility?: unknown; readonly description?: string }
export type Fields = Readonly<Record<string, Field>>;
export interface Step { readonly name: string; readonly type: string; readonly writes?: ReadonlyArray<string>; readonly optional?: boolean; readonly call?: unknown }
export interface Thing {
  readonly name: string; readonly identifier: string; readonly description: string; readonly fields: Fields;
  readonly machine: null | { readonly states: ReadonlyArray<string>; readonly moves: Record<string, { readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits: string }>; readonly notFrom: { readonly error: string; readonly exit: number; readonly code: string } };
  readonly events: Readonly<Record<string, Fields>>;
  readonly errors: Readonly<Record<string, { readonly fields: Fields; readonly exit: number; readonly code: string }>>;
}
export interface Op {
  readonly kind: "operation" | "read"; readonly name: string; readonly thing: string; readonly verb: string; readonly identifier: string; readonly description: string;
  readonly payload: Fields; readonly answer: Fields; readonly move: null | { readonly key: string; readonly emits: string };
  readonly errors: ReadonlyArray<string>; readonly steps: Readonly<Record<string, Step>>;
}
export interface Model { readonly things: Readonly<Record<string, Thing>>; readonly operations: Readonly<Record<string, Op>> }

export const modelOf = (root: string) => JSON.parse(textAt(root, "generated/model/model.json")) as Model;
export const portalOf = (root: string) => (JSON.parse(textAt(root, "generated/portal/blueprint.json")) as { readonly model: Model }).model;
export const camel = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
export const operations = (m: Model) => Object.values(m.operations);
export const things = (m: Model) => Object.values(m.things);
/** The variable prefix the generators form from the project's folder name: `plugged-in` is `PLUGGED_IN`. */
export const envPrefix = (root: string) => basename(root).toUpperCase().replace(/-/g, "_");

/** Fails at once, with the reason, when the example is not there: every test of the Plugged In groups starts here. */
export const requireExample = () => {
  if (!existsSync(join(pluggedIn, "package.json"))) throw new Error(MISSING);
  if (!existsSync(join(pluggedIn, "node_modules"))) throw new Error("examples/plugged-in has no node_modules: M1.40 adds it to the workspace, then `pnpm install`");
  return pluggedIn;
};

/** A copy of the example in a fresh folder with no `generated/`: every output below is written by the real `ortho generate`. */
export const freshProject = (example: string, overlay?: string) => {
  const copy = copyOf(example, ["ortho.config.ts", "blueprint", "src", "journeys", "package.json"].filter((p) => existsSync(join(example, p))));
  if (overlay !== undefined) cpSync(overlay, copy.root, { recursive: true });
  try { succeeds(copy.root, "generate"); } catch (error) { copy.remove(); throw error; }
  return copy;
};

// ---- the readers, one per grid cell ----

const walk = (root: string, dirs: ReadonlyArray<string>) => dirs.flatMap((dir) => tree(root, `generated/${dir}`).map((path) => ({ path, text: textAt(root, path) })));

/** ✓ operation and read × SDK: one function per operation, as the SDK exports them. */
export const sdkMissing = (root: string, m: Model) => {
  const sdk = exportsOf(root).things;
  return operations(m).filter((op) => !(sdk[camel(op.thing)] ?? []).includes(op.identifier)).map((op) => `SDK has no ${camel(op.thing)}.${op.identifier}`);
};

export const cliHelp = (root: string, ...path: ReadonlyArray<string>) => {
  const result = spawnSync(process.execPath, [join(root, "generated/cli/src/main.ts"), ...path, "--help"], { cwd: root, encoding: "utf8", timeout: 120_000 });
  return { status: result.status, text: `${result.stdout}${result.stderr}` };
};

/** ✓ operation and read × CLI: a command per operation, its help listing a flag per payload field. */
export const cliMissing = (root: string, m: Model) => operations(m).flatMap((op) => {
  const help = cliHelp(root, op.thing, op.verb);
  return help.status !== 0 ? [`${op.thing} ${op.verb} --help exits ${help.status}`]
    : Object.keys(op.payload).filter((f) => !help.text.includes(`--${f}`)).map((f) => `${op.thing} ${op.verb} --help has no --${f}`);
});

/** Every field of every operation's payload with its description, and the help text of its command: ~ thing and fields × CLI. */
export const cliHelpProblems = (root: string, m: Model) => operations(m).flatMap((op) => {
  const help = cliHelp(root, op.thing, op.verb).text;
  return Object.entries(op.payload).flatMap(([f, field]) => (field.description ?? "") === "" ? [`${op.name}.${f}: the model has no description`]
    : help.includes(field.description!) ? [] : [`${op.thing} ${op.verb} --help does not carry ${op.name}.${f}'s description`]);
});

/** ~ thing and fields × CLI: a flag is typed from its field, so a number is not text. The model says which are numbers. */
export const cliUntyped = (root: string, m: Model) => operations(m).flatMap((op) => {
  const text = textAt(root, `generated/cli/src/${op.thing}/${op.verb}.ts`);
  return Object.entries(op.payload).filter(([name, f]) => f.value.type === "uint" && text.includes(`Flag.String("${name}")`)).map(([name]) => `${op.name} --${name} is a number in the model and text in the CLI`);
});

export interface Tool { readonly name: string; readonly readOnly: boolean; readonly input: { readonly properties?: Record<string, { readonly description?: string }> } }
/** The MCP tools of the generated catalog, as the host lists them (the input schema is the payload's, computed with no world). */
export const mcpTools = (root: string): ReadonlyArray<Tool> => {
  const file = join(root, ".ortho/loop/mcp-tools.ts");
  mkdirSync(join(root, ".ortho/loop"), { recursive: true });
  writeFileSync(file, [
    `import { Mcp } from "@orthograph/language-effect";`, `import { catalog } from "../../generated/mcp/src/index.ts";`,
    `const served = new Proxy({}, { get: () => ({ run: () => { throw new Error("no world"); } }) }) as never;`,
    `const tools = Mcp.tools({ catalog, served, refusals: { codes: {}, declared: {} } as never });`,
    `console.log(JSON.stringify(tools.map((t) => ({ name: t.name, readOnly: t.readOnly, input: t.input }))));`, ""].join("\n"));
  const result = spawnSync(process.execPath, [file], { cwd: root, encoding: "utf8", timeout: 120_000 });
  if (result.status !== 0) throw new Error(`the MCP catalog did not load:\n${result.stderr}`);
  return JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "[]") as ReadonlyArray<Tool>;
};

/** ✓ operation and read × MCP: a tool per operation, read-only for a read. */
export const mcpMissing = (root: string, m: Model) => {
  const tools = new Map(mcpTools(root).map((t) => [t.name, t]));
  return [...operations(m).flatMap((op) => (tools.get(op.name) === undefined ? [`MCP has no tool ${op.name}`] : tools.get(op.name)!.readOnly === (op.kind === "read") ? [] : [`${op.name} readOnly is wrong`])),
    ...[...tools.keys()].filter((n) => m.operations[n] === undefined).map((n) => `MCP has a tool the model has not: ${n}`)];
};

/** ~ thing and fields × MCP: each input property says what its field is. */
export const mcpUndescribed = (root: string, m: Model) => {
  const tools = new Map(mcpTools(root).map((t) => [t.name, t]));
  return operations(m).flatMap((op) => Object.entries(op.payload).flatMap(([f, field]) => (field.description ?? "") === "" ? [`${op.name}.${f}: the model has no description`]
    : tools.get(op.name)?.input.properties?.[f]?.description === field.description ? [] : [`MCP ${op.name}.${f} does not carry the field's description`]));
};

/** ✓ operation and read × portal: the portal's data file holds each operation as the model has it. */
export const portalOperationDiffs = (portal: Model, m: Model) => operations(m).flatMap((op) => {
  const got = portal.operations[op.name] as unknown as Record<string, unknown> | undefined;
  if (got === undefined) return [`portal has no ${op.name}`];
  const want = op as unknown as Record<string, unknown>;
  return ["kind", "thing", "verb", "description", "payload", "answer", "move", "errors", "allowed", "budget", "idempotent"].filter((k) => JSON.stringify(got[k]) !== JSON.stringify(want[k])).map((k) => `portal ${op.name}.${k} differs from the model`);
});

/** ✗ by design × SDK, CLI and MCP: a step runs inside the handler, so no client output names one. */
export const stepsInClients = (root: string, m: Model) => {
  const files = walk(root, ["sdk", "cli", "mcp"]);
  return operations(m).flatMap((op) => Object.values(op.steps).flatMap((s) => files.filter((f) => f.text.includes(s.name)).map((f) => `${f.path} names step ${s.name}`)));
};

/** ~ step × portal: every detail of a step (`optional`, `writes`, the call), not only its name and type. */
export const portalStepDiffs = (portal: Model, m: Model) => operations(m).filter((op) => JSON.stringify(portal.operations[op.name]?.steps) !== JSON.stringify(op.steps)).map((op) => `portal ${op.name}.steps differ from the model`);

/** ✓ the machine: states and moves reach the portal as the model has them. */
export const portalMachineDiffs = (portal: Model, m: Model) => things(m).filter((t) => JSON.stringify([portal.things[t.name]?.machine?.states, portal.things[t.name]?.machine?.moves]) !== JSON.stringify([t.machine?.states, t.machine?.moves]))
  .map((t) => `portal ${t.name} states or moves differ from the model`);

/** ~ thing and fields × portal: each field's description and visibility, and the thing's own description (✓ today). */
export const portalFieldDiffs = (portal: Model, m: Model) => things(m).flatMap((t) => Object.entries(t.fields).flatMap(([f, field]) => {
  const got = portal.things[t.name]?.fields[f];
  return [...((field.description ?? "") === "" ? [`${t.name}.${f}: the model has no description`] : []),
    ...(got?.description === field.description ? [] : [`portal ${t.name}.${f} has no description like the model's`]),
    ...(JSON.stringify(got?.visibility ?? "public") === JSON.stringify(field.visibility ?? "public") ? [] : [`portal ${t.name}.${f} visibility differs`])];
}));
export const portalThingDescriptionDiffs = (portal: Model, m: Model) => things(m).filter((t) => t.description === "" || portal.things[t.name]?.description !== t.description).map((t) => `portal ${t.name} description`);

/** ~ event × portal: each event with the fields it carries. */
export const portalEventDiffs = (portal: Model, m: Model) => things(m).flatMap((t) => Object.entries(t.events).filter(([e, fields]) => JSON.stringify((portal.things[t.name]?.events ?? {})[e]) !== JSON.stringify(fields)).map(([e]) => `portal ${t.name} event ${e} is not as the model has it`));

/** ~ error × portal: each error with its code, exit and fields; and the machine's own refusal with its code. */
export const portalErrorDiffs = (portal: Model, m: Model) => things(m).flatMap((t) => [
  ...Object.entries(t.errors).filter(([e, v]) => JSON.stringify((portal.things[t.name]?.errors ?? {})[e]) !== JSON.stringify(v)).map(([e]) => `portal ${t.name} error ${e} lacks its code`),
  ...(t.machine && (portal.things[t.name]?.machine?.notFrom as { code?: string } | undefined)?.code !== t.machine.notFrom.code ? [`portal ${t.name} machine refusal ${t.machine.notFrom.error} lacks its code`] : []),
]);

/**
 * ✓ events and errors × the API: the names and codes the server speaks are the model's. Each error's code and exit are read
 * from its row of the generated `refusals` table (K16, M1.47), which replaced the separate `exits` table.
 */
export const apiDiffs = (root: string, m: Model) => {
  const events = textAt(root, "generated/api/src/events.ts");
  const errors = textAt(root, "generated/api/src/errors.ts");
  return [
    ...things(m).flatMap((t) => Object.keys(t.events).filter((e) => !events.includes(`"${e}"`)).map((e) => `API events omit ${e}`)),
    ...things(m).flatMap((t) => Object.entries(t.errors).filter(([e, v]) => !errors.includes(`class ${e} `) || !errors.includes(`"${v.code}"`) || !new RegExp(`\\b${e}: \\{ code: "${v.code}", exit: ${v.exit},`).test(errors)).map(([e]) => `API errors omit ${e}, its code or its exit`)),
    ...things(m).flatMap((t) => (t.machine ? [t.machine.notFrom] : []).filter((n) => !errors.includes(`"${n.code}"`) || !new RegExp(`\\b${n.error}: \\{ code: "${n.code}", exit: ${n.exit},`).test(errors)).map((n) => `API errors omit ${n.error}`)),
  ];
};

// ---- what a type-check of the SDK's exports says ----

/** Names the SDK must export as types: each thing's, each of its fields' by index, each event's. Missing ones, by name, from one `tsc` run; `failure` says when tsc itself did not run cleanly and gave no verdict. */
export const sdkTypesMissing = (root: string, m: Model) => {
  const lines: Array<{ readonly label: string; readonly text: string }> = [
    ...things(m).flatMap((t) => [{ label: `type ${t.identifier}`, text: `export type T${t.identifier} = Sdk.${t.identifier};` },
      ...Object.keys(t.fields).map((f) => ({ label: `${t.identifier}["${f}"]`, text: `export type T${t.identifier}_${f.replace(/\W/g, "_")} = Sdk.${t.identifier}["${f}"];` }))]),
    ...things(m).flatMap((t) => Object.keys(t.events).map((e) => ({ label: `event ${e}`, text: `export type E${e} = Sdk.${e};` }))),
  ];
  const dir = join(root, ".ortho/loop");
  mkdirSync(dir, { recursive: true });
  const head = ['import type * as Sdk from "../../generated/sdk/src/index.ts";'];
  writeFileSync(join(dir, "types.ts"), [...head, ...lines.map((l) => l.text), ""].join("\n"));
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ extends: join(root, "tsconfig.json"), compilerOptions: { noEmit: true }, include: ["./types.ts"] }));
  const result = spawnSync(join(root, "node_modules/.bin/tsc"), ["-p", join(dir, "tsconfig.json"), "--pretty", "false"], { cwd: root, encoding: "utf8", timeout: 180_000 });
  const out = `${result.stdout}${result.stderr}`;
  const bad = new Set([...out.matchAll(/types\.ts\((\d+),\d+\): error/g)].map((x) => Number(x[1]) - head.length - 1));
  // With no diagnostic on a probe line, a tsc that did not exit cleanly (no spawn, killed or timed out, or a non-zero exit) proved
  // nothing: that is a failure of its own, never an empty `missing`.
  const failure = bad.size > 0 || (result.error === undefined && result.status === 0) ? undefined
    : `tsc did not run cleanly: ${result.error?.message ?? (result.status === null ? `ended by ${result.signal}` : `exit ${result.status}`)}`;
  return { missing: lines.filter((_, i) => bad.has(i)).map((l) => l.label), out, checked: lines.length, failure };
};
