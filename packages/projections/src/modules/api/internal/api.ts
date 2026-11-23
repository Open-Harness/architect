// generated/api: the contract. Endpoints from each operation's own declaration, wire errors, the handler types.
import { Names } from "orthograph/server";
import type { Model, OperationModel } from "@orthograph/compiler";
import type { RenderedFile } from "#modules/names/types.js";
import { GENERATED, IDEMPOTENCY_CONFLICT, IDEMPOTENCY_CONFLICT_EXIT, NOT_ALLOWED_EXIT, READ_NOT_SERVED, READ_NOT_SERVED_EXIT, STATUS, declarationAt, lines, onDevice, opVar, pascal, thingFileAt } from "#modules/names/service.js";

const file = (path: string, content: string): RenderedFile => ({ path, content, scaffold: false });

const errors = (model: Model): RenderedFile => {
  const path = "generated/api/src/errors.ts";
  const things = Object.values(model.things);
  const declaring = things.filter((t) => Object.keys(t.errors).length > 0);
  const rows: Array<string> = [];
  const declared: Array<string> = [];
  const body: Array<string> = [];
  // One row per refusal: its code, its exit and its HTTP status, written once and read by every surface (K16, M1.47).
  const row = (name: string, code: string, exit: number, status: number) => {
    rows.push(`  ${name}: { code: "${code}", exit: ${exit}, status: ${status} },`);
  };
  // Each refusal's code is beside its tag: a field on the wire class, and a static the runtime reads it from.
  const cls = (name: string, fields: string) =>
    `export class ${name} extends Schema.TaggedError<${name}>()("${name}", { code: Schema.Literal(refusals.${name}.code), ...${fields} }, { httpApiStatus: refusals.${name}.status }) { static readonly code = refusals.${name}.code; }`;
  for (const t of declaring) {
    for (const [name, e] of Object.entries(t.errors)) {
      body.push(`ErrorNames.name(${t.identifier}.${name}, "${name}");`);
      body.push(cls(name, `wireStruct(${t.identifier}.${name}.fields).fields`));
      // A thing's declared `<Thing>NotFound` is its not-found refusal, adopted by the runtime (K16): 404, not 422.
      row(name, e.code, e.exit, name === `${t.identifier}NotFound` ? STATUS.notFound : STATUS.declared);
      declared.push(`  ${name}: ${t.identifier}.${name},`);
    }
  }
  for (const t of things) {
    if (!t.machine) continue;
    const { error, exit, code } = t.machine.notFrom;
    // The state the thing was found in: one of the machine's own, so a caller can match on it.
    body.push(cls(error, `{ state: Schema.Literals([${t.machine.states.map((s) => JSON.stringify(s)).join(", ")}]) }`));
    row(error, code, exit, STATUS.notFrom);
  }
  for (const t of things) {
    // The generated `<Thing>NotFound`, carrying the id that named nothing; a declared one is already above.
    if (!t.notFound || t.notFound.error in t.errors) continue;
    const { error, exit, code } = t.notFound;
    body.push(cls(error, "{ id: Schema.String }"));
    row(error, code, exit, STATUS.notFound);
  }
  body.push(cls("NotAllowed", "{}"));
  row("NotAllowed", model.refusals["NotAllowed"] ?? "AR-001", NOT_ALLOWED_EXIT, STATUS.notAllowed);
  body.push(cls(IDEMPOTENCY_CONFLICT, "{}"));
  row(IDEMPOTENCY_CONFLICT, model.refusals[IDEMPOTENCY_CONFLICT] ?? "AR-002", IDEMPOTENCY_CONFLICT_EXIT, STATUS.idempotencyConflict);
  // A derived read that looks at problems is not served yet: it refuses by name, 501, never as a defect (the rest are served, slice 7 of Goal 17).
  if (READ_NOT_SERVED in model.refusals) {
    body.push(cls(READ_NOT_SERVED, "{ read: Schema.String, message: Schema.String }"));
    row(READ_NOT_SERVED, model.refusals[READ_NOT_SERVED]!, READ_NOT_SERVED_EXIT, STATUS.notServed);
  }
  const names = rows.map((e) => e.trim().split(":")[0]);
  return file(path, lines(
    GENERATED,
    `import { Schema } from "effect";`,
    `import { ErrorNames, wireStruct } from "${Names.frontDoor}/server";`,
    declaring.map((t) => `import * as ${t.identifier} from "${thingFileAt(path, t, "errors")}";`),
    "",
    "/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */",
    "export const refusals = {", rows, "} as const;",
    "type Refusal = keyof typeof refusals;",
    "",
    body,
    "",
    "/** Each refusal's exit code, for the CLI: read from `refusals`. */",
    "export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K][\"exit\"] };",
    "",
    "/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */",
    "export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K][\"code\"] };",
    "",
    "/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */",
    "export const declared = {", declared, "} as const;",
    "",
    "/** The wire class of each refusal, by name. */",
    `export const wire = { ${names.join(", ")} };`,
  ));
};

/** The names of the fields a client may not be shown: private to roles, or secret and not issued by this call. */
const cut = (fields: Readonly<Record<string, { readonly visibility?: unknown; readonly issued?: true }>>, issuing: boolean) =>
  Object.entries(fields).filter(([, f]) => f.visibility !== undefined && !(issuing && f.issued === true)).map(([k]) => `"${k}"`);

const endpoint = (op: OperationModel, model: Model): RenderedFile => {
  const path = `generated/api/src/${op.thing}/${op.verb}.ts`;
  // What the SDK is typed to decode: a field the server may cut for a caller is optional, in the answer and in each list item.
  const keys = cut(op.answer, op.kind === "operation");
  const itemKeys = op.list ? cut(Object.fromEntries(Object.entries(model.things[op.thing]?.fields ?? {}).filter(([k]) => k !== "state")), false) : [];
  const typed = keys.length > 0 || itemKeys.length > 0;
  return file(path, lines(
    `// Generated from ${op.file}. Do not edit.`,
    `import { HttpApiEndpoint } from "effect/http-api";`,
    `import { ${op.list ? "listItemFields, " : ""}wireStruct${typed ? ", type Wired" : ""} } from "${Names.frontDoor}/server";`,
    `import declaration from "${declarationAt(path, op.file)}";`,
    `import { ${op.refusals.join(", ")} } from "../errors.ts";`,
    "",
    "export { declaration };",
    `export const endpoint = HttpApiEndpoint.post("${op.verb}", "/${op.thing}/${op.verb}", {`,
    "  payload: declaration.payloadSchema,",
    `  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.`,
    `  // Typed as the declaration types it: the schema is built from fields known only at run time, which TypeScript cannot follow.`,
    `  success: wireStruct(declaration.answer, { issuing: true${op.list ? ", items: listItemFields(declaration.thing)" : ""} }) as unknown as ${typed ? `Wired<typeof declaration.answerSchema, ${keys.length > 0 ? keys.join(" | ") : "never"}${itemKeys.length > 0 ? `, ${itemKeys.join(" | ")}` : ""}>` : "typeof declaration.answerSchema"},`,
    `  error: [${op.refusals.join(", ")}],`,
    "});",
  ));
};

/** An operation that runs on the device has no route: only its declaration, which the SDK and the CLI read. */
const declarationOnly = (op: OperationModel): RenderedFile => {
  const path = `generated/api/src/${op.thing}/${op.verb}.ts`;
  return file(path, lines(
    `// Generated from ${op.file}. Do not edit.`,
    `import declaration from "${declarationAt(path, op.file)}";`,
    "",
    "export { declaration };",
  ));
};

/** Some environment's clock is stepped or scaled (K23): the runtime then provides `Timers` to handlers, and the handler's type says so. */
const isTimed = (model: Model): boolean =>
  Object.values(model.environments ?? {}).some((e) => e.clock !== undefined && e.clock.kind !== "real");

const handlerType = (op: OperationModel, timed: boolean): RenderedFile => {
  const path = `generated/api/src/${op.thing}/${op.verb}.handler.ts`;
  return file(path, lines(
    GENERATED,
    "// What the handler is given: its payload and steps; what it may return: its answer or a declared error.",
    `import type { SqlClient } from "effect/sql";`,
    `import type { Auth, Handler as Of, Records${timed ? ", Timers" : ""} } from "${Names.pkg("language-effect")}";`,
    `import type declaration from "${declarationAt(path, op.file)}";`,
    "",
    `export type Handler<R = Records | SqlClient.SqlClient | Auth${timed ? " | Timers" : ""}> = Of<typeof declaration, R>;`,
    // Where the move can end, as the machine's literal states: a handler's `Match` over it is exhaustive (K16).
    (op.move?.to.length ?? 0) > 1 ? ["/** Where the move can end: one of its outcomes, as the machine declares them. */", `export type Outcome = NonNullable<(typeof declaration)["move"]>["to"][number];`] : [],
  ));
};

const index = (model: Model, name: string): RenderedFile => {
  const ops = Object.values(model.operations);
  const things = [...new Set(ops.map((o) => o.thing))];
  return file("generated/api/src/index.ts", lines(
    GENERATED,
    `import { HttpApi, HttpApiGroup } from "effect/http-api";`,
    ops.map((o) => `import * as ${opVar(o)} from "./${o.thing}/${o.verb}.ts";`),
    "",
    things.map((t) => {
      const adds = ops.filter((o) => o.thing === t).map((o) => `.add(${opVar(o)}.endpoint)`).join("");
      return `export class ${pascal(t)} extends HttpApiGroup.make("${t}")${adds} {}`;
    }),
    `export class Api extends HttpApi.make("${name}")${things.map((t) => `.add(${pascal(t)})`).join("")} {}`,
    "",
    `export * as Errors from "./errors.ts";`,
    `export * as Events from "./events.ts";`,
    `export const operations = { ${ops.map((o) => `"${o.name}": ${opVar(o)}`).join(", ")} } as const;`,
  ));
};

/** Events take their names from their exports; the runtime journals them by that name. */
const events = (model: Model): RenderedFile => {
  const path = "generated/api/src/events.ts";
  const emitting = Object.values(model.things).filter((t) => Object.keys(t.events).length > 0);
  return file(path, lines(
    GENERATED,
    `import { EventNames } from "${Names.frontDoor}/server";`,
    emitting.map((t) => `import * as ${t.identifier} from "${thingFileAt(path, t, "events")}";`),
    "",
    emitting.flatMap((t) => Object.keys(t.events).map((e) => `EventNames.name(${t.identifier}.${e}, "${e}");`)),
    "",
    `export const names = [${emitting.flatMap((t) => Object.keys(t.events).map((e) => `"${e}"`)).join(", ")}] as const;`,
  ));
};

/** `served` is the model without its device operations; each of those still gets its declaration in the API folder. */
export const renderApi = (model: Model, name: string, served: Model = model): ReadonlyArray<RenderedFile> => [
  errors(served),
  events(served),
  index(served, name),
  ...Object.values(served.operations).flatMap((op) => (op.kind === "read" ? [endpoint(op, served)] : [endpoint(op, served), handlerType(op, isTimed(served))])),
  ...Object.values(model.operations).filter(onDevice).map(declarationOnly),
];
