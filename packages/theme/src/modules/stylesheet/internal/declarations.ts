import type { TokenMap } from "../../tokens/types.ts";

/** One declaration per line, indented to sit inside a rule at `depth`. */
export const declare = (map: TokenMap, depth: number): string =>
  Object.entries(map)
    .map(([name, value]) => `${"  ".repeat(depth)}${name}: ${value};`)
    .join("\n");

/** The entries of `of` that `against` does not hold with the same value: what a scheme must say again to win over the other. */
export const differing = (of: TokenMap, against: TokenMap): TokenMap =>
  Object.fromEntries(Object.entries(of).filter(([name, value]) => against[name] !== value));
