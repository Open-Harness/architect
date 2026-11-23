// What the generated Worker says about its operations and its identity: the runtime's refusals each names, and where the people live.
import type { Model, OperationModel } from "@orthograph/compiler";
import { Names } from "orthograph/server";
import { camel } from "#modules/names/service.js";

export const emptyPath = (o: OperationModel) => `empty/${o.thing}/${o.verb}.ts`;

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
