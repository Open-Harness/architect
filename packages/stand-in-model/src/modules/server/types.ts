// The model stand-in as a service: `POST /v1/chat/completions` (SSE) and the `/_stand/*` commands. Nothing here touches a socket: the entry gives each
// request a `Sink` to write into, and runs the effects.
import type { Effect } from "effect";
import type { Json } from "../script/types.ts";

/** What the entry hands over of one request. */
export interface Request {
  readonly method: string;
  readonly path: string;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: string;
}

/** Where a reply is written: the entry's wrapper of the socket. `destroy` drops the connection. */
export interface Sink {
  readonly head: (status: number, headers: Readonly<Record<string, string>>) => void;
  readonly write: (text: string) => void;
  readonly end: (text?: string) => void;
  readonly destroy: () => void;
}

/** What a `/_stand/<command>` answers: a status and a JSON body. */
export interface CommandAnswer {
  readonly status: number;
  readonly body: Json;
}

export interface ModelStand {
  /** A chat completion, written into `sink`. A request held by a turn or a hold waits here until it is released. */
  readonly chat: (request: Request, sink: Sink) => Effect.Effect<void>;
  /** One of `script`, `done`, `seen`, `hold`, `held`, `release`, `fail`, `reset`. */
  readonly command: (name: string, args: Json) => Effect.Effect<CommandAnswer>;
}

export interface ServerApi {
  readonly make: Effect.Effect<ModelStand>;
}
