// The mount `add` writes: the plugin imported from its package, each choice at its first option, said out loud.
import type { AnyChoice } from "orthograph";

const kindOf = (x: unknown) => (typeof x === "object" && x !== null ? (x as { kind?: unknown }).kind : undefined);
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const access = (path: ReadonlyArray<string>) => path.map((k) => (IDENTIFIER.test(k) ? `.${k}` : `[${JSON.stringify(k)}]`)).join("");

/** Each choice's first option, as the mount writes it: `p.choices.style.plain`. */
export const firstPicks = (choices: unknown, path: ReadonlyArray<string> = []): ReadonlyArray<string> =>
  typeof choices !== "object" || choices === null ? [] : Object.entries(choices).sort(([a], [b]) => a.localeCompare(b)).flatMap(([key, value]) => {
    if (kindOf(value) !== "choice") return typeof value === "object" && value !== null ? firstPicks(value, [...path, key]) : [];
    const first = Object.keys((value as AnyChoice).options)[0];
    return first === undefined ? [] : [`p.choices${access([...path, key, first])}`];
  });

/** `@fixture/echo` is imported as `echo`; a name that isn't an identifier is `plugin`. */
const variable = (pkg: string) => {
  const own = pkg.slice(pkg.lastIndexOf("/") + 1).replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  return IDENTIFIER.test(own) ? own : "plugin";
};

export const mountFile = (pkg: string, version: string, picks: ReadonlyArray<string>) => {
  const name = variable(pkg);
  const verbs = picks.length === 0 ? "" : `, (p) => [${picks.map((pick) => `p.choose(${pick})`).join(", ")}]`;
  return [
    `// Scaffolded from ${pkg} ${version}. Yours from now on.`,
    `import { Blueprint } from "orthograph";`,
    `import ${name} from "${pkg}";`,
    "",
    `export default Blueprint.use(${name}${verbs});`,
    "",
  ].join("\n");
};
