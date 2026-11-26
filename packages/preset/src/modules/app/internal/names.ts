/** Names a package of the app's own name would clash with: it depends on both. */
export const RESERVED: ReadonlyArray<string> = ["orthograph", "effect"];

/** Lower case words joined by dashes: `bakery`, `pastry-shop`. */
export const isName = (name: string): boolean => /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);

/** What is wrong with `name`, or nothing. */
export const problem = (name: string): string | undefined =>
  !isName(name)
    ? `${JSON.stringify(name)} isn't a name for an app: use lower case words joined by dashes, like bakery or pastry-shop`
    : RESERVED.includes(name)
      ? `${JSON.stringify(name)} is a reserved name (an app of that name would be a package that depends on itself): choose another`
      : undefined;
