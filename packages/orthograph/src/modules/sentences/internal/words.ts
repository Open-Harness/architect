// The small pieces of English a sentence is built from.

/** `HandleName` and `sign-in` as `handle name` and `sign in`. */
export const words = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").toLowerCase();

/** `a`, `a and b`, `a, b and c`: a list as a phrase, with the word that closes it. */
export const joined = (xs: ReadonlyArray<string>, joiner: string): string => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} ${joiner} ${xs.at(-1)}`);
