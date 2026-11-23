import { Blueprint } from "orthograph";

// @ts-expect-error a call is "promise" or "effect", nothing else
export const bad = Blueprint.call({ mode: "callback", errors: [] });
