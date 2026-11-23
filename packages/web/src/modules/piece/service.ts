import { idle } from "./internal/state.ts";
import { readApi } from "./internal/read.ts";
import { readSlots, writeSlots } from "./internal/slots.ts";
import { writeApi } from "./internal/write.ts";
import type { PieceState } from "./types.ts";

/**
 * What every generated piece shares: the kinds of its options, its state, its api and its parts. A generated primitive is a
 * `definePrimitive` call that names these (K29 section 3.2), so the two things UI SDK does not document (the bridge reads
 * `pending` and `error`; only a callback sees who pressed) live here, once.
 */
export const piece = {
  /** The options of a move or a write; the generated primitive adds one `"string"` for each id field of its payload. */
  options: { host: "value", onSend: "callback", onDone: "callback" },
  /** The options of a read; the generated primitive adds one for each payload field. */
  readOptions: { host: "value", onSend: "callback" },
  state: <Answer>(): PieceState<Answer> => idle<Answer>(),
  /** A read starts pending: it loads as soon as it is on the page. */
  readState: <Answer>(): PieceState<Answer> => ({ ...idle<Answer>(), pending: true }),
  api: writeApi,
  readApi,
  slots: writeSlots,
  readSlots,
} as const;
