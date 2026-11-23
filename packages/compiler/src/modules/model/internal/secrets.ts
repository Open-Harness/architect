// Names the declared secrets: the name in every environment comes from the mount and the export, never from a string
// (M2-04-secrets-readings, call 5 and the derivation). A name that can't be split without guessing is refused.
import type { SecretModel } from "../types.ts";
import type { Layout } from "./layout.ts";

/** Lowercase words, each capitalized after the first: `webhookSigning`. A digit or a run of capitals (`key2`, `apiURL`) could split two ways. */
const WORDS = /^[a-z]+(?:[A-Z][a-z]+)*$/;
const words = (name: string): string => name.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
const mountWords = (mount: string): string => mount.replace(/-/g, "_").toUpperCase();

interface Candidate {
  readonly name: string;
  readonly model: SecretModel;
  /** How a message names where it is declared. */
  readonly where: string;
}

/** Every declared secret by its derived name, sorted; two on one name, or one that can't be split, are problems. */
export const secretsOf = (layout: Layout, problems: Array<string>): Readonly<Record<string, SecretModel>> => {
  const found: Array<Candidate> = [];
  const take = (exported: string, file: string, name: string, model: SecretModel, where: string) => {
    if (!WORDS.test(exported)) {
      problems.push(`${file}: export "${exported}" can't be turned into a secret's name without guessing where its words split: write it as lowercase words in camelCase, with no digits and no run of capitals (apiKey, not apiURL or key2)`);
      return;
    }
    found.push({ name, model, where });
  };
  for (const s of layout.secrets.values()) {
    const d = s.declaration;
    take(s.export, s.file, words(s.export), { how: d.how, kind: d.secretKind, export: s.export, from: { kind: "app" }, ...(d.describe === undefined ? {} : { describe: d.describe }) }, `export ${s.export} in ${s.file}`);
  }
  for (const s of layout.mountSecrets) {
    const d = s.declaration;
    take(s.export, `${s.mountFile}`, `${mountWords(s.mount)}_${words(s.export)}`, {
      how: d.how, kind: d.secretKind, export: s.export,
      from: { kind: s.kind, mount: s.mount, package: s.package, version: s.version },
      ...(d.describe === undefined ? {} : { describe: d.describe }),
    }, `export ${s.export} of ${s.package}, mounted in ${s.mountFile}`);
  }
  const byName = new Map<string, Array<Candidate>>();
  for (const c of found) byName.set(c.name, [...(byName.get(c.name) ?? []), c]);
  for (const [name, same] of byName) {
    if (same.length > 1) problems.push(`secret ${name} is declared twice: ${same.map((c) => c.where).join(" and ")}: mount one under another name, or rename an export`);
  }
  return Object.fromEntries([...byName].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([name, [first]]) => [name, first!.model]));
};
