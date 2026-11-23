import type { CallsApi } from "./types.ts";
import { runner } from "./internal/run.ts";

export const Calls: CallsApi = { runner };
