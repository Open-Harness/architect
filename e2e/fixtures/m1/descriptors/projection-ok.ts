// Positive: a projection descriptor a third party can write: where it runs, how its callers sign in, what it renders.
import { Effect } from "effect";
import { Blueprint, Via } from "orthograph";

export const docs = Blueprint.projection({
  description: "Docs, one page per operation.",
  choices: {},
  host: [],
  via: [Via.session, Via.key, Via.device, Via.agent],
  takes: () => true,
  render: () => Effect.succeed([]),
  ships: [],
});
export const kind: "projection" = docs.kind;
