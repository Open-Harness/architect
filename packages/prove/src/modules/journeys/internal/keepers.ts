// Who in a journey is the keeper: a cast member cast as `Blueprint.keeper`, in the journey's own cast or in any starting
// world it begins from (its cast is the journey's too). The casts are resolved the way `Journeys.run` does, oldest first
// and the later declaration winning, so a name recast as someone signed in is not the keeper. The keeper is no one to
// sign up, and it is not built yet (M8.10).
type Cast = { readonly [name: string]: unknown };

const isKeeper = (role: unknown) => (role as { readonly kind?: string } | undefined)?.kind === "keeper";

/** `casts` oldest first: a starting world's lineage, then the journey's own. */
export const keepersIn = (names: ReadonlyArray<string>, casts: ReadonlyArray<Cast>): ReadonlySet<string> => {
  const resolved: Cast = Object.assign({}, ...casts);
  return new Set(names.filter((n) => isKeeper(resolved[n])));
};
