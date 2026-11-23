import type { ClockApi, SpansApi, TimeApi } from "./types.ts";
import { readSpan } from "./internal/words.ts";

export const Times: TimeApi = {
  every: (span, anchor = {}) => Object.freeze({ kind: "every", span, ...anchor }),
  after: (field, span) => Object.freeze({ kind: "after", span, field }),
};

export const Clocks: ClockApi = {
  real: () => Object.freeze({ kind: "clock", which: "real" }),
  stepped: ({ starts }) => Object.freeze({ kind: "clock", which: "stepped", starts }),
  scaled: ({ starts, speed = 1 }) => Object.freeze({ kind: "clock", which: "scaled", starts, speed }),
};

export const Spans: SpansApi = { read: readSpan };
