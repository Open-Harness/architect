import { door } from "./internal/door.ts";
import { drain } from "./internal/drain.ts";
import { fanout } from "./internal/fanout.ts";
import { hopsOf } from "./internal/hops.ts";
import type { OutboxApi } from "./types.ts";

export const Outbox: OutboxApi = { hopsOf, drain, door, fanout };
