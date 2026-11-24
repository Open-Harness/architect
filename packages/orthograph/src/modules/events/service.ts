import { structOf } from "#modules/things/service.js";
import type { EventNaming, EventsApi } from "./types.ts";

// Events are frozen, so their names are kept beside them.
const names = new WeakMap<object, string>();

export const Events: EventsApi = {
  event: (fields) => Object.freeze({ kind: "event", fields, schema: structOf(fields) }),
  on: (event, map, options) => Object.freeze({ kind: "on", event, map: map as never, onRefused: options?.onRefused }),
};

export const EventNames: EventNaming = {
  name: (event, name) => void names.set(event, name),
  nameOf: (event) => names.get(event),
};
