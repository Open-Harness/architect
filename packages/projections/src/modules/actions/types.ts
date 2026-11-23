// The `actions` projection is a `Projection` (orthograph's plugins module).
import { Data } from "effect";
export type { Projection } from "orthograph";

/** An operation declares a refusal the model has no code for: the model is wrong, and no action is written from it. */
export class UnknownRefusal extends Data.TaggedError("UnknownRefusal")<{ readonly message: string }> {}
