// What the generated Worker says about its operations and its identity: the runtime's refusals each names, and where the people live.
import type { Model, OperationModel } from "@orthograph/compiler";
import { Names } from "orthograph/server";
import { camel, opVar, pascal } from "#modules/names/service.js";

export const emptyPath = (o: OperationModel) => `empty/${o.thing}/${o.verb}.ts`;

/** Each operation step's inner operation, served, by the step's key (#1079): `operations: { draft: entryDraftServed }`. */
export const innerOf = (model: Model, o: OperationModel, suffix: "Served" | "Scaffolded") => {
  const inner = Object.entries(o.steps).flatMap(([key, s]) => {
    const op = s.type === "operation" && s.operation !== undefined ? model.operations[s.operation] : undefined;
    return op === undefined ? [] : [`${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${opVar(op)}${suffix}`];
  });
  return inner.length > 0 ? `, operations: { ${inner.join(", ")} }` : "";
};

/** The operations in the order their served constants are declared: each inner operation before the operations that run it, else as given. */
export const innerFirst = (model: Model, ops: ReadonlyArray<OperationModel>): ReadonlyArray<OperationModel> => {
  const out: Array<OperationModel> = [];
  const placed = new Set<string>();
  const place = (o: OperationModel) => {
    if (placed.has(o.name)) return;
    // The compiler refuses a cycle, so marking first only keeps a refused blueprint from looping.
    placed.add(o.name);
    for (const s of Object.values(o.steps)) {
      const inner = s.type === "operation" && s.operation !== undefined ? model.operations[s.operation] : undefined;
      if (inner !== undefined && ops.includes(inner)) place(inner);
    }
    out.push(o);
  };
  for (const o of ops) place(o);
  return out;
};

/** The runtime's refusals the generated code names: the machine's, when the move starts from a state (D2 #37), and each not-found. */
export const notFromOf = (model: Model, o: OperationModel) => {
  const machine = model.things[o.thing]?.machine;
  const notFrom = o.move && o.move.from.length > 0 && machine ? `, notFrom: "${machine.notFrom.error}"` : "";
  // Each payload field no role check reads, and the `<Thing>NotFound` a missing one is refused with (K16, M1.46).
  const missing = Object.entries(o.notFound ?? {});
  // Each refusal the runtime makes for a rule this operation can break (G5), and the rule it is for.
  const ruled = Object.entries(o.invariants ?? {});
  return `${notFrom}${missing.length > 0 ? `, notFound: { ${missing.map(([k, e]) => `${k}: "${e}"`).join(", ")} }` : ""}${ruled.length > 0 ? `, invariants: { ${ruled.map(([tag, rule]) => `${tag}: "${rule}"`).join(", ")} }` : ""}`;
};

/**
 * Where the identity keeps its users: Better Auth's table, today the identity behind `AuthD1`. Named here, in what the
 * generated server says, never in host code; the identity plugin (M2.05) will own it.
 */
const IDENTITY_USERS = "auth_user";
/**
 * The thing the identity keeps, bound explicitly: the identity's users are what a `Principal` calls a `person`, so its
 * thing is the one named `person` (K16 review, 22.1). Never found by its id prefix: an app thing may use `per_` too.
 */
const IDENTITY_THING = "person";
export const peopleOf = (model: Model) => {
  const people = model.things[IDENTITY_THING];
  return people ? `, people: { thing: thingIn(${camel(people.name)}Thing), table: "${IDENTITY_USERS}" }` : "";
};

/**
 * How the Worker exports its world (and its actors). A blueprint with a stepped or scaled clock extends the world with its wake
 * route (M8.07): each kind of durable timer to the code that wakes it, empty until a feature registers a kind. Any other
 * blueprint re-exports the host's, exactly as it always did.
 */
export const worldExports = (timed: boolean, actors: boolean): ReadonlyArray<string> => {
  const host = Names.pkg("host-cloudflare");
  if (!timed) return [actors ? `export { Actor, World } from "${host}";` : `export { World } from "${host}";`];
  return [
    `import { World as WorldHost, type WorldWakes } from "${host}";`,
    ...(actors ? [`export { Actor } from "${host}";`] : []),
    "",
    "/** Which code wakes each kind of durable timer when it falls due: empty until a feature registers a kind (a workflow, an agent, the keeper). */",
    "const wakes: WorldWakes = {};",
    "",
    "/** The world, with its wake route: a due timer of a kind that is not here fails its step and stays pending. */",
    "export class World extends WorldHost {",
    "  protected override wakeKinds(): WorldWakes {",
    "    return wakes;",
    "  }",
    "}",
  ];
};

/** One thing's routes: each operation handled through the runtime's wrapper, under the services taken once. */
export const groupOf = (ops: ReadonlyArray<OperationModel>, empty: boolean, timed: boolean) => (t: string): ReadonlyArray<string> => {
  const handles = ops
    .filter((o) => o.thing === t)
    .map((o) => {
      const serve = empty && o.kind === "operation"
        ? `request.headers["x-ortho-starting-world"] === "1" ? ${opVar(o)}Served : ${opVar(o)}Scaffolded`
        : `${opVar(o)}Served`;
      return `      .handle("${o.verb}", ({ payload, request }) => call(${serve}, payload, request.headers).pipe(Effect.provideContext(services)))`;
    });
  return [
    `const ${pascal(t)}Live = HttpApiBuilder.group(CallApi, "${t}", Effect.fn(function* (handlers) {`,
    "  // The services are taken once, when the routes are built; each request keeps its own tracer and span.",
    `  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth${timed ? ", Timers, DurableTimers" : ""})(yield* Effect.context<Services>());`,
    "  return handlers",
    ...handles.map((h, i) => (i === handles.length - 1 ? `${h};` : h)),
    "}));",
  ];
};
