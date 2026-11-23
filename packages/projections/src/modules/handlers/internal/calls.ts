// What an operation that calls an adapter needs generated beside it: the callable and the adapter's layer wired into the
// served operation (generated/server), and the handler's type, which carries the callable's own types (also in
// generated/server, so no foreign type ever reaches generated/api or generated/sdk, which clients import).
import { Names } from "orthograph/server";
import type { Model, OperationModel } from "@orthograph/compiler";
import type { RenderedFile } from "#modules/names/types.js";
import { GENERATED, camel, declarationAt, lines, pascal } from "#modules/names/service.js";

/** The call steps of an operation: the step's key, and the mount and call it reaches. */
export const callSteps = (op: OperationModel) =>
  Object.entries(op.steps).flatMap(([key, step]) => (step.call ? [{ key, ...step.call }] : []));

const callVar = (mount: string, call: string) => `${camel(mount)}${pascal(call)}Call`;
const layerVar = (mount: string) => `${camel(mount)}Layer`;
const callable = (model: Model, mount: string, call: string) => `${model.mounts?.[mount]?.package ?? mount}/src/calls/${call}.js`;

/** The server's imports of every callable and layer its operations wire, once each. */
export const callImports = (model: Model): ReadonlyArray<string> => {
  const steps = Object.values(model.operations).flatMap(callSteps);
  const calls = [...new Map(steps.map((s) => [callVar(s.mount, s.call), s] as const))];
  const layers = [...new Set(steps.filter((s) => model.mounts?.[s.mount]?.layer).map((s) => s.mount))];
  return [
    ...calls.map(([name, s]) => `import ${name} from "${callable(model, s.mount, s.call)}";`),
    ...layers.map((m) => `import { layer as ${layerVar(m)} } from "${model.mounts![m]!.package}/src/layer.js";`),
  ];
};

/** `, calls: { price: { run, layer } }` for `Handlers.serve`, or nothing for an operation that calls nothing. */
export const wired = (model: Model, op: OperationModel): string => {
  const steps = callSteps(op);
  if (steps.length === 0) return "";
  const one = (s: (typeof steps)[number]) =>
    `${s.key}: { run: ${callVar(s.mount, s.call)}${model.mounts?.[s.mount]?.layer ? `, layer: ${layerVar(s.mount)}` : ""} }`;
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
        steps.map((s) => `import type ${camel(s.key)}Call from "${callable(model, s.mount, s.call)}";`),
        "",
        `export type Handler<R = Records | SqlClient.SqlClient | Auth${timed ? " | Timers" : ""}> = Of<typeof declaration, R, { ${steps.map((s) => `${s.key}: typeof ${camel(s.key)}Call`).join(", ")} }>;`,
      ),
    }];
  });
};
