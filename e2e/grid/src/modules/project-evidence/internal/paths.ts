import type { ProjectModel } from "../types.ts";

/** `generated/docs/<thing>/<verb>.md`, or `generated/docs/<thing>/index.md` for a thing's own page. */
export const docsPath = (thing: string, verb?: string) => `generated/docs/${thing}/${verb ?? "index"}.md`;

/** The CLI commands a model asks `--help` of: the root, each thing, each operation's `<thing> <verb>`. */
export const cliCommands = (model: ProjectModel): ReadonlyArray<string> => [
  "",
  ...Object.keys(model.things),
  ...Object.values(model.operations).map((op) => `${op.thing} ${op.verb}`),
];
