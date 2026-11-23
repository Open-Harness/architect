// A test's expectation of the run's coverage line, built from the compiled model alone: the checks that read `ortho prove`'s output (layer 1's 02 and 08,
// M1's 00, prove's own test) all expect this one line. It is written apart from `internal/run.ts` on purpose, so a build that drops the "not counted"
// suffix, or adds it where nothing is left out, cannot make its own expectation: the suffix is required exactly when the model lists a left-out refusal.
interface ModelView {
  readonly refusals: Readonly<Record<string, string>>;
  readonly operations: Readonly<Record<string, { readonly errors: ReadonlyArray<string>; readonly refusals: ReadonlyArray<string> }>>;
}

/** The runtime's refusals the model lists on an operation that no journey can cause: everything under `NotAllowed`'s prefix but `NotAllowed` (G3). */
export const leftOut = (model: ModelView): ReadonlyArray<string> => {
  const prefix = model.refusals["NotAllowed"]?.split("-")[0];
  if (prefix === undefined) return [];
  return Object.entries(model.refusals)
    .filter(([name, code]) => name !== "NotAllowed" && code.startsWith(`${prefix}-`))
    .map(([name]) => name)
    .filter((name) => Object.values(model.operations).some((op) => op.refusals.includes(name) && !op.errors.includes(name)));
};

/** `coverage ✔ <totals>`, with the suffix when the model lists a refusal the count leaves out, and without it when it does not. */
export const coverageLine = (totals: string, model: ModelView): string => {
  const left = leftOut(model);
  return `coverage ✔ ${totals}${left.length ? ` (not counted: ${left.join(", ")}, which no journey can cause: a step cannot send a second payload under a held request key)` : ""}`;
};
