import { settle } from "./internal/edge.ts";
import { registry } from "./internal/registry.ts";
import { defineAction } from "./internal/wrapper.ts";
import type { ActionsApi } from "./types.ts";

export { ActionRefusal } from "./internal/refusal.ts";

export const Actions: ActionsApi = { defineAction, runForAction: settle, registry };
