// An exit means one thing (K16 section g, M1.47): the CLI exits with a refusal's code, so a declared exit can't be one
// the runtime keeps for itself, can't be past what a shell reports as a code, and can't be another refusal's of the same
// thing (its other errors and its machine's). Exits are unique per thing, not per app: two machines both at 40 is fine.
import type { FromModel } from "../types.ts";

/** Exits the runtime keeps, and whose they are. */
export const RESERVED_EXITS: ReadonlyMap<number, string> = new Map([
  [0, "success"], [1, "a defect"], [2, "InvalidPayload"], [3, "NotAllowed"], [4, "NotFound"],
  [120, "IdempotencyConflict"], [121, "the runtime"], [122, "the runtime"], [123, "the runtime"], [124, "the runtime"], [125, "the runtime"],
]);
const LOWEST = 5;
const HIGHEST = 119;

type ThingExits = {
  readonly identifier: string;
  readonly errors: Readonly<Record<string, { readonly exit: number }>>;
  readonly machine: { readonly notFrom: { readonly error: string; readonly exit: number } } | null;
  readonly from: FromModel;
};

/** A thing's blueprint file, as the author sees it: in the app, or in the plugin it came from. */
export const fileOf = (thing: string, from: FromModel, file: string) =>
  from.kind !== "app" ? `${from.package}/blueprint/things/${from.thing}/${file}.js` : `blueprint/things/${thing}/${file}.ts`;

/**
 * A thing's declared `<Thing>NotFound` is the runtime's not-found refusal, which carries only the missing `id`: any other
 * field would be one nothing fills, so it is refused (K16, M1.46).
 */
export const notFoundShapes = (things: Readonly<Record<string, ThingExits & { readonly errors: Readonly<Record<string, { readonly fields: object }>> }>>) =>
  Object.entries(things).flatMap(([thing, t]) => {
    const name = `${t.identifier}NotFound`;
    const extra = Object.keys(t.errors[name]?.fields ?? {}).filter((f) => f !== "id");
    return extra.length === 0 ? [] : [`${fileOf(thing, t.from, "errors")}: ${name} is the runtime's not-found refusal, which carries only the missing id; drop ${extra.join(", ")}`];
  });

/** Whose a reserved or out-of-range exit is, or undefined when a refusal may use it. */
const unusable = (exit: number, mayBeNotFound: boolean): string | undefined =>
  !Number.isInteger(exit) ? "not a whole number"
  : mayBeNotFound && exit === 4 ? undefined
  : RESERVED_EXITS.has(exit) ? `${RESERVED_EXITS.get(exit)}'s`
  : exit < LOWEST || exit > HIGHEST ? `outside ${LOWEST} to ${HIGHEST}, which are the blueprint's` : undefined;

/** One problem per declared exit that clashes, naming the error, its exit, whose it is, and the file declaring it. */
export const exitClashes = (things: Readonly<Record<string, ThingExits>>): ReadonlyArray<string> =>
  Object.entries(things).flatMap(([thing, t]) => {
    const file = fileOf(thing, t.from, "errors");
    const notFrom = t.machine?.notFrom;
    const machineBad = notFrom === undefined ? undefined : unusable(notFrom.exit, false);
    const taken = new Map<number, string>(notFrom ? [[notFrom.exit, notFrom.error]] : []);
    return [
      ...(notFrom && machineBad ? [`${fileOf(thing, t.from, "machine")}: ${notFrom.error}'s exit ${notFrom.exit} is ${machineBad}; pick another`] : []),
      ...Object.entries(t.errors).flatMap(([name, { exit }]) => {
        // Only the thing's own declared `<Thing>NotFound` may keep the not-found exit: it is that refusal.
        const bad = unusable(exit, name === `${t.identifier}NotFound`);
        const owner = taken.get(exit);
        if (owner === undefined) taken.set(exit, name);
        if (bad !== undefined) return [`${file}: ${name}'s exit ${exit} is ${bad}; pick another`];
        return owner !== undefined ? [`${file}: ${name}'s exit ${exit} is ${owner}'s; pick another`] : [];
      }),
    ];
  });

/**
 * What one operation may refuse is judged as a whole: two refusals at one exit, whichever things declared them, can't be
 * told apart by the CLI. A pair from one thing is already named by `exitClashes`; this names the pairs across things.
 */
export const operationExitClashes = (
  things: Readonly<Record<string, ThingExits>>,
  operations: Readonly<Record<string, { readonly file: string; readonly name: string; readonly errors: ReadonlyArray<string>; readonly invariants?: Readonly<Record<string, string>>; readonly move: { readonly from: ReadonlyArray<string> } | null; readonly thing: string }>>,
): ReadonlyArray<string> => {
  const exits = new Map<string, { readonly exit: number; readonly thing: string }>();
  for (const [thing, t] of Object.entries(things)) {
    if (t.machine) exits.set(t.machine.notFrom.error, { exit: t.machine.notFrom.exit, thing });
    for (const [name, { exit }] of Object.entries(t.errors)) exits.set(name, { exit, thing });
  }
  return Object.values(operations).flatMap((o) => {
    // The refusals the runtime makes for a rule count too, and are named with the rule's file (G5).
    const ruled = o.invariants ?? {};
    const names = [...new Set([...o.errors, ...(o.move && o.move.from.length > 0 && things[o.thing]?.machine ? [things[o.thing]!.machine!.notFrom.error] : []), ...Object.keys(ruled)])];
    const by = (name: string) => { const rule = ruled[name]; const owner = rule === undefined ? undefined : things[rule.split(".")[0]!]; return rule === undefined || owner === undefined ? "" : ` (${name} is refused for ${rule} in ${fileOf(rule.split(".")[0]!, owner.from, "invariants")})`; };
    return names.flatMap((name, i) => names.slice(0, i).flatMap((other) => {
      const a = exits.get(other);
      const b = exits.get(name);
      return a && b && a.exit === b.exit && a.thing !== b.thing && unusable(a.exit, true) === undefined
        ? [`${o.file}: ${o.name} refuses both ${other} and ${name} at exit ${a.exit}: ${name}'s exit ${a.exit} is ${other}'s; pick another${by(name)}${by(other)}`]
        : [];
    }));
  });
};
