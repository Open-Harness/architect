// generated/sdk/src/<thing>/types.ts: what a caller can name. The thing as the SDK hands it back, the union of its machine's states, and its events.
import type { FieldsModel, Model, ThingModel } from "@orthograph/compiler";
import { article } from "#modules/names/service.js";
import { GENERATED, lines, thingFileAt } from "#modules/names/service.js";
import type { RenderedFile } from "#modules/names/types.js";

// A sentence inside a doc comment: its own comment end would close the comment early.
export const comment = (text: string) => text.replace(/\*\//g, "*\\/").replace(/\s*\n\s*/g, " ");

/** The fields of one type, each with its sentence as a doc comment and its type from the blueprint's own value. */
const members = (fields: FieldsModel, source: string, of: string, extra: ReadonlyArray<string> = []): ReadonlyArray<string> => [
  ...Object.entries(fields).flatMap(([k, f]) => [
    ...(f.description === undefined ? [] : [`  /** ${comment(f.description)} */`]),
    `  readonly ${JSON.stringify(k)}${f.visibility === undefined ? "" : "?"}: ${of}<${source}[${JSON.stringify(k)}]>;`,
  ]),
  ...extra,
];

/** The types file of one thing: `Link` (each field), `LinkState` (`"listed" | "removed"`) and each event it emits. */
const typesOf = (t: ThingModel): RenderedFile => {
  const path = `generated/sdk/src/${t.name}/types.ts`;
  const state = `${t.identifier}State`;
  const events = Object.keys(t.events);
  // The module aliases below are local: one that a thing's own name, state or event would clash with takes a trailing underscore.
  const taken = new Set([t.identifier, state, ...events]);
  const alias = (n: string) => (taken.has(n) ? `${n}_` : n);
  const [Source, Events, Declared, Of] = [alias("Source"), alias("Events"), alias("Declared"), alias("Of")];
  return {
    path,
    scaffold: false,
    content: lines(
      GENERATED,
      // A thing and its events are found by what they are, not by their exports' names: a blueprint file may name them as it likes.
      `import type * as ${Source} from "${thingFileAt(path, t, "thing")}";`,
      events.length > 0 ? `import type * as ${Events} from "${thingFileAt(path, t, "events")}";` : [],
      "",
      `type ${Declared} = Extract<(typeof ${Source})[keyof typeof ${Source}], { readonly kind: "thing" }>["fields"];`,
      "/** What a field or value holds, as the blueprint's own schema decodes it. */",
      `type ${Of}<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;`,
      "",
      t.machine ? [`/** The states ${article(t.name)} ${t.name} moves between, as its machine declares them. */`, `export type ${state} = ${t.machine.states.map((s) => JSON.stringify(s)).join(" | ")};`, ""] : [],
      `/** ${comment(t.description)} A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */`,
      `export type ${t.identifier} = {`,
      ...members(t.fields, Declared, Of, t.machine && !("state" in t.fields) ? [`  readonly "state": ${state};`] : []),
      "};",
      ...events.flatMap((e) => ["", `/** The event ${e}: what it carries when ${article(t.name)} ${t.name} moves. */`, `export type ${e} = {`, ...members(t.events[e]!, `(typeof ${Events})[${JSON.stringify(e)}]["fields"]`, Of), "};"]),
    ),
  };
};

/** One types file per thing, and the lines that put its names in the SDK's front door. */
export const sdkTypes = (model: Model): { readonly files: ReadonlyArray<RenderedFile>; readonly exports: ReadonlyArray<string> } => {
  const things = Object.values(model.things);
  return {
    files: things.map(typesOf),
    exports: things.map((t) => `export type { ${[t.identifier, ...(t.machine ? [`${t.identifier}State`] : []), ...Object.keys(t.events)].join(", ")} } from "./${t.name}/types.ts";`),
  };
};
