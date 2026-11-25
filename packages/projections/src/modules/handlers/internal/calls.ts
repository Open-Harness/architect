// What an operation that calls an adapter needs generated beside it: the callable and the adapter's layer wired into the
// served operation (generated/server), and the handler's type, which carries the callable's own types (also in
// generated/server, so no foreign type ever reaches generated/api or generated/sdk, which clients import).
//
// A generated adapter (G16-adapter-mounts call 1) has no `src/calls/`: its call runs the package's `client`, given the mount's
// address (`ORTHO_STAND_<MOUNT>`, else `<MOUNT>_BASE_URL`) and key (`<MOUNT>_API_KEY`) from the Worker's environment. No address
// is a defect the runner raises before anything is sent; nothing ever defaults to the description's `servers`.
import { Names } from "orthograph/server";
import type { Model, OperationModel } from "@orthograph/compiler";
import type { RenderedFile } from "#modules/names/types.js";
import { GENERATED, camel, declarationAt, lines, pascal } from "#modules/names/service.js";

/** The call steps of an operation: the step's key, and the mount and call it reaches. */
export const callSteps = (op: OperationModel) =>
  Object.entries(op.steps).flatMap(([key, step]) => (step.call ? [{ key, ...step.call }] : []));

/**
 * A call's name as part of a variable's: one-to-one, so two calls never share a variable. A group's `.` is `$$`, and any other
 * character a name can't hold is `$<its code in hex>$` (`quotes.get` is `quotes$$get`, `users:search` is `users$3a$search`):
 * read left to right, `$$` is a dot and `$` before hex opens an escape, so no two names give one variable. A name with
 * neither, every name before generated adapters, is as it was.
 */
const ident = (call: string) => call.replace(/[^A-Za-z0-9_]/g, (c) => (c === "." ? "$$" : `$${c.codePointAt(0)!.toString(16)}$`));
const callVar = (mount: string, call: string) => `${camel(mount)}${pascal(ident(call))}Call`;
const layerVar = (mount: string) => `${camel(mount)}Layer`;
const clientVar = (mount: string) => `${camel(mount)}Client`;
const callable = (model: Model, mount: string, call: string) => `${model.mounts?.[mount]?.package ?? mount}/src/calls/${call}.js`;
/** A mount's name as its environment's variables spell it: `fx-backup` is `FX_BACKUP`. */
const envName = (mount: string) => mount.toUpperCase().replaceAll("-", "_");

/** A mount of a generated adapter: its plugin declares the `baseUrl` secret, which only the adapter generator writes. */
const generatedMount = (model: Model, mount: string) =>
  Object.values(model.secrets ?? {}).some((s) => s.export === "baseUrl" && s.from.kind !== "app" && s.from.mount === mount);

/** The server's imports of every callable and layer its operations wire, once each. */
export const callImports = (model: Model): ReadonlyArray<string> => {
  const steps = Object.values(model.operations).flatMap(callSteps);
  const calls = [...new Map(steps.map((s) => [callVar(s.mount, s.call), s] as const))];
  const layers = [...new Set(steps.filter((s) => model.mounts?.[s.mount]?.layer).map((s) => s.mount))];
  const clients = [...new Set(steps.map((s) => s.mount))].filter((m) => generatedMount(model, m)).sort();
  return [
    ...calls.filter(([, s]) => !generatedMount(model, s.mount)).map(([name, s]) => `import ${name} from "${callable(model, s.mount, s.call)}";`),
    ...layers.map((m) => `import { layer as ${layerVar(m)} } from "${model.mounts![m]!.package}/src/layer.js";`),
    ...(clients.length === 0 ? [] : [
      `import { env as callEnv } from "cloudflare:workers";`,
      ...clients.map((m) => `import { client as ${clientVar(m)} } from "${model.mounts![m]!.package}/client";`),
      "/** The Worker's variables, which give each generated adapter's mount its address and key. */",
      "const callVars = callEnv as unknown as Readonly<Record<string, string | undefined>>;",
    ]),
    ...clients.map((m) => {
      const [stand, base, key] = [`ORTHO_STAND_${envName(m)}`, `${envName(m)}_BASE_URL`, `${envName(m)}_API_KEY`];
      return `const ${camel(m)}Address = () => callVars["${stand}"] || callVars["${base}"];\n`
        + `const ${camel(m)}Calls = () => ${clientVar(m)}({ baseUrl: ${camel(m)}Address()!, ...(callVars["${key}"] ? { token: callVars["${key}"] } : {}) }).calls as unknown as Readonly<Record<string, any>>;`;
    }),
    ...calls.filter(([, s]) => generatedMount(model, s.mount)).map(([name, s]) =>
      `const ${name} = { run: (input?: Readonly<Record<string, unknown>>) => ${camel(s.mount)}Calls()${s.call.split(".").map((p) => `[${JSON.stringify(p)}]`).join("")}(input), unset: () => (${camel(s.mount)}Address() ? undefined : "${envName(s.mount)}_BASE_URL") };`),
  ];
};

/** `, calls: { price: { run, layer } }` for `Handlers.serve`, or nothing for an operation that calls nothing. */
export const wired = (model: Model, op: OperationModel): string => {
  const steps = callSteps(op);
  if (steps.length === 0) return "";
  const one = (s: (typeof steps)[number]) => generatedMount(model, s.mount)
    ? `${s.key}: ${callVar(s.mount, s.call)}`
    : `${s.key}: { run: ${callVar(s.mount, s.call)}${model.mounts?.[s.mount]?.layer ? `, layer: ${layerVar(s.mount)}` : ""} }`;
  return `, calls: { ${steps.map(one).join(", ")} }`;
};

/** Where a handler of an operation that calls takes its type from. */
export const handlerTypeAt = (op: OperationModel) => `generated/server/handlers/${op.thing}/${op.verb}.ts`;

/** The handler's type for an operation that calls an adapter: each call step typed by the callable it runs. */
export const renderHandlerTypes = (model: Model): ReadonlyArray<RenderedFile> => {
  // Some environment's clock is stepped or scaled (K23): the runtime then provides `Timers` to handlers.
  const timed = Object.values(model.environments ?? {}).some((e) => e.clock !== undefined && e.clock.kind !== "real");
  return Object.values(model.operations).flatMap((op) => {
    const steps = callSteps(op);
    if (op.kind !== "operation" || steps.length === 0) return [];
    const path = handlerTypeAt(op);
    return [{
      path,
      scaffold: false,
      content: lines(
        GENERATED,
        "// What the handler is given: its payload, and its steps, each call typed by the callable it runs.",
        `import type { SqlClient } from "effect/sql";`,
        `import type { Auth, Handler as Of, Records${timed ? ", Timers" : ""} } from "${Names.pkg("language-effect")}";`,
        `import type declaration from "${declarationAt(path, op.file)}";`,
        steps.map((s) => generatedMount(model, s.mount)
          // A generated adapter's call takes one flat input object and settles to the answer's JSON (its `client`).
          ? `declare const ${camel(s.key)}Call: (input?: Readonly<Record<string, unknown>>) => Promise<unknown>;`
          : `import type ${camel(s.key)}Call from "${callable(model, s.mount, s.call)}";`),
        "",
        `export type Handler<R = Records | SqlClient.SqlClient | Auth${timed ? " | Timers" : ""}> = Of<typeof declaration, R, { ${steps.map((s) => `${s.key}: typeof ${camel(s.key)}Call`).join(", ")} }>;`,
      ),
    }];
  });
};
