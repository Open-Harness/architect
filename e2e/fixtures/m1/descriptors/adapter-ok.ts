// Positive: an adapter descriptor with a Promise call and an Effect call, mounted with `include`.
import { Blueprint } from "orthograph";

export class PriceUnavailable extends Blueprint.error({}, { exit: 76 }) {}

export const pricing = Blueprint.adapter({
  description: "Prices from the remote service.",
  choices: {},
  calls: {
    quote: Blueprint.call({ mode: "promise", errors: [PriceUnavailable] }),
    refresh: Blueprint.call({ mode: "effect", errors: [PriceUnavailable] }),
  },
});

export const mount = Blueprint.use(pricing, (p) => [p.include(p.calls.quote)]);
export const kind: "adapter" = pricing.kind;
