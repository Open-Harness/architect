import { Effect } from "effect";
import { RefusalEvals } from "../refusal-evals/service.ts";
import type { EvidenceApi } from "./types.ts";

/** An operation's generated docs page: `generated/docs/<thing>/<verb>.md`. */
const docsPath = (thing: string, verb: string) => `generated/docs/${thing}/${verb}.md`;

export const Evidence: EvidenceApi = {
  ofRefusal: ({ model, refusal, ports }) =>
    Effect.gen(function* () {
      const pages = yield* Effect.all(RefusalEvals.declaredBy(model, refusal).map((name) => {
        const op = model.operations[name]!;
        return Effect.all({ docs: ports.read(docsPath(op.thing, op.verb)), portal: ports.portal(`/portal/operations/${name}`) }).pipe(Effect.map((got) => [name, got] as const));
      }));
      const observed = yield* ports.observed(refusal);
      const spans = yield* ports.spans();
      return {
        model,
        docs: Object.fromEntries(pages.map(([name, got]) => [name, got.docs])),
        portal: Object.fromEntries(pages.map(([name, got]) => [name, got.portal])),
        spans,
        held: observed?.held ?? [],
        cli: observed?.cli,
        mcp: observed?.mcp,
      };
    }),
};
