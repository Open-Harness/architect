import { Context } from "effect";

/** The environment this world or deployment stands for, written on every operation span as `environment`. `local` when nobody says. */
export const Environment = Context.Reference<string>("@orthograph/language-effect/Environment", { defaultValue: () => "local" });
