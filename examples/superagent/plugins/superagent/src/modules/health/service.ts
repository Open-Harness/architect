import { CAP, type Health, type Watched } from "./types.ts";

const isWatched = (x: unknown): x is Watched =>
  typeof x === "object" && x !== null && typeof (x as Watched).failures === "number" && typeof (x as Watched).after === "number";

/** Keep each watched record whose failures reached its count, at most `CAP`, and say when a cap cut some. */
export const healthOf = (_superagent: unknown, found: { readonly watched: ReadonlyArray<unknown> }): Health => {
  const failing = found.watched.filter(isWatched).filter((w) => w.failures >= w.after);
  return {
    problems: failing.slice(0, CAP).map(({ kind, id, name, failures }) => ({ kind, id, name, failures })),
    more: failing.length > CAP,
  };
};
