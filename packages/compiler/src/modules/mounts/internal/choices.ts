// A plugin's choices, named by their path in its `choices` (`style`, `signer.node`), and what a mount picked of each.
import type { AnyChoice, Mount, Option } from "orthograph";
import type { PluginPackage } from "#modules/source/types.js";

const kindOf = (x: unknown) => (typeof x === "object" && x !== null ? (x as { kind?: unknown }).kind : undefined);

/** Every choice in a plugin's choices, by its dotted path, in name order. */
export const choicesIn = (choices: unknown, path: ReadonlyArray<string> = []): ReadonlyArray<readonly [string, AnyChoice]> =>
  typeof choices !== "object" || choices === null ? [] : Object.entries(choices).sort(([a], [b]) => a.localeCompare(b)).flatMap(([key, value]) =>
    kindOf(value) === "choice" ? [[[...path, key].join("."), value as AnyChoice] as const]
    : typeof value === "object" && value !== null ? choicesIn(value, [...path, key])
    : []);

const said = (choices: ReadonlyArray<readonly [string, AnyChoice]>) =>
  choices.map(([name, c]) => `${name}: ${Object.keys(c.options).join(" or ")}`).join("; ") || "none";

/** What the mount picked of each choice, and what's wrong with its `choose` verbs, naming its file. */
export const chosenOf = (file: string, pkg: string, mount: Mount, choices: ReadonlyArray<readonly [string, AnyChoice]>, installed: ReadonlyArray<PluginPackage> = []) => {
  const problems: Array<string> = [];
  const picks = new Map<AnyChoice, Option>();
  for (const verb of mount.verbs) {
    if (verb.verb !== "choose") continue;
    const option = verb.option as unknown;
    if (kindOf(option) !== "option") {
      problems.push(`${file}: choose takes one of ${pkg}'s options, written p.choices.<choice>.<option> (${said(choices)}); it was given ${JSON.stringify(option) ?? String(option)}`);
      continue;
    }
    const { choice } = option as Option;
    const named = choices.find(([, c]) => c === choice);
    if (!named) {
      const owner = installed.find((p) => p.name !== pkg && choicesIn((p.descriptor as { readonly choices?: unknown } | undefined)?.choices).some(([, c]) => c === choice));
      problems.push(`${file}: chooses an option that isn't one of ${pkg}'s choices (${said(choices)})${owner ? `: it is one of ${owner.name}'s, another plugin` : ""}`);
      continue;
    }
    if (picks.has(choice)) { problems.push(`${file}: chooses ${named[0]} twice; a mount picks one option of each choice`); continue; }
    picks.set(choice, option as Option);
  }
  const chosen = Object.fromEntries(choices.map(([name, c]) => [name, picks.get(c)?.key ?? Object.keys(c.options)[0] ?? ""]));
  return { chosen, problems };
};
