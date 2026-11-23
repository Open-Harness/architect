// Who in a journey is the keeper: a cast member cast as `Blueprint.keeper`, in the journey's own cast or in any starting
// world it begins from (its cast is the journey's too). The keeper is no one to sign up, and it is not built yet (M8.10).
type Cast = { readonly [name: string]: unknown };

const isKeeper = (role: unknown) => (role as { readonly kind?: string } | undefined)?.kind === "keeper";

export const keepersIn = (names: ReadonlyArray<string>, casts: ReadonlyArray<Cast>): ReadonlySet<string> =>
  new Set(names.filter((n) => casts.some((cast) => isKeeper(cast[n]))));
