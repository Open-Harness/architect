import { Effect } from "effect";
import type { WireApi } from "./types.ts";
import { held, shown } from "./internal/shown.ts";
export { CallTelemetry } from "./internal/call-telemetry.ts";

const fieldsOf = (e: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(e).filter(([k]) => k !== "_tag"));

export const Wire: WireApi = {
  refusals: (classes) => (effect) =>
    Effect.catch(effect, (e) => {
      const tag = typeof e === "object" && e !== null ? (e as { readonly _tag?: unknown })._tag : undefined;
      const Class = typeof tag === "string" ? classes[tag] : undefined;
      // The code is the class's own, set beside the tag.
      return Class ? Effect.fail(new Class({ ...fieldsOf(e as object), code: Class.code } as never)) : Effect.die(e);
    }),
  shown,
  held,
};
