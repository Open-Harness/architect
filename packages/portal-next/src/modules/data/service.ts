import { Effect } from "effect";
import { makeStore } from "./internal/store.ts";
import { read } from "./internal/read.ts";
import type { BlueprintWire } from "@orthograph/portal";
import type { DataApi, DataFailed, Loaded, PortalData } from "./types.ts";

const load: DataApi["load"] = () =>
  Effect.gen(function* () {
    const blueprint = yield* read<BlueprintWire>("/_portal/v1/blueprint");
    const snapshot = yield* read<PortalData["snapshot"]>(`/_portal/v1/snapshot?digest=${encodeURIComponent(blueprint.digest)}`);
    return { blueprint, snapshot };
  });

const loaded: DataApi["loaded"] = () =>
  load().pipe(Effect.match({
    onSuccess: (data): Loaded => ({ state: "ready", data }),
    onFailure: (failure: DataFailed): Loaded => ({ state: "failed", failure }),
  }));

export const Data: DataApi = { load, loaded, store: makeStore };
