import { Blueprint } from "orthograph";

/** What a frozen revision hashes to. */
export const Digest = Blueprint.value(Blueprint.text({ max: 64 }));
/** Who opened a proposal. */
export const Person = Blueprint.value(Blueprint.text({ max: 64 }));
