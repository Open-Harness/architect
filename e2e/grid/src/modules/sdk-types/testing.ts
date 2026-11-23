// What the generator writes for Plugged In's link (M1.42): the file the SDK evals' tests start from and change one thing in.
import type { ProjectEvidence, ThingModel } from "../project-evidence/types.ts";

export const LINK_TYPES_PATH = "generated/sdk/src/link/types.ts";

export const LINK_TYPES = `// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/link/thing.ts";
import type * as Events from "../../../../blueprint/things/link/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a link moves between, as its machine declares them. */
export type LinkState = "listed" | "removed";

/** A title and web address on a public page. */
export type Link = {
  readonly "id": Of<Declared["id"]>;
  readonly "profile": Of<Declared["profile"]>;
  readonly "owner": Of<Declared["owner"]>;
  readonly "title": Of<Declared["title"]>;
  readonly "url": Of<Declared["url"]>;
  readonly "state": LinkState;
};

/** The event LinkAdded: what it carries when a link moves. */
export type LinkAdded = {
  readonly "link": Of<(typeof Events)["LinkAdded"]["fields"]["link"]>;
};
`;

/** The evidence with the SDK's link types file written as `text` (the real one by default). */
export const withLinkTypes = (e: ProjectEvidence, text = LINK_TYPES): ProjectEvidence => ({ ...e, files: { ...e.files, [LINK_TYPES_PATH]: text } });

/** What the generator writes for a thing's types file, from the model; `members` replaces the type written for a field (`{ title: 'Of<Declared["url"]>' }`). */
export const typesText = (thing: ThingModel, members: Readonly<Record<string, string>> = {}): string => {
  const states = thing.machine?.states ?? [];
  return [
    `import type * as Source from "../../../../blueprint/things/${thing.name}/thing.ts";`,
    `import type * as Events from "../../../../blueprint/things/${thing.name}/events.ts";`,
    `type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];`,
    "type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;",
    ...(states.length > 0 ? [`export type ${thing.identifier}State = ${states.map((s) => JSON.stringify(s)).join(" | ")};`] : []),
    `export type ${thing.identifier} = {`,
    ...Object.keys(thing.fields).map((f) => `  readonly ${JSON.stringify(f)}: ${members[f] ?? `Of<Declared[${JSON.stringify(f)}]>`};`),
    ...(states.length > 0 && !("state" in thing.fields) ? [`  readonly "state": ${thing.identifier}State;`] : []),
    "};",
    "",
  ].join("\n");
};
