// pi-env's wire frames (docs/protocol.md): u32 length (the bytes after it), u8 type, u32 id, u32 json length, json, payload. Big-endian.
import { Effect } from "effect";

export const REQUEST = 1;
export const RESULT = 2;
export const ERROR = 3;
export const PING = 6;

/** Complete frames (each with its length field) at the front of `pending` + `incoming`, and the bytes of the one still arriving. */
export const split = (pending: Buffer, incoming: Buffer): { readonly frames: ReadonlyArray<Buffer>; readonly rest: Buffer } => {
  let all = pending.length === 0 ? incoming : Buffer.concat([pending, incoming]);
  const frames: Array<Buffer> = [];
  while (all.length >= 4 && all.length >= 4 + all.readUInt32BE(0)) {
    const size = 4 + all.readUInt32BE(0);
    frames.push(all.subarray(0, size));
    all = all.subarray(size);
  }
  return { frames, rest: all };
};

export const typeOf = (frame: Buffer): number => (frame.length > 4 ? frame.readUInt8(4) : 0);
export const idOf = (frame: Buffer): number => (frame.length >= 9 ? frame.readUInt32BE(5) : 0);

/** The frame's JSON object, or undefined when it has none or it does not parse. */
export const jsonOf = (frame: Buffer): Effect.Effect<Record<string, unknown> | undefined> =>
  frame.length < 13
    ? Effect.succeed(undefined)
    : Effect.try({ try: () => JSON.parse(frame.subarray(13, 13 + frame.readUInt32BE(9)).toString("utf8")) as unknown, catch: () => undefined }).pipe(
        Effect.map((json) => (typeof json === "object" && json !== null && !Array.isArray(json) ? (json as Record<string, unknown>) : undefined)),
        Effect.orElseSucceed(() => undefined),
      );

/** A frame of `type` for request `id`, with a JSON object and no payload. */
export const frameOf = (type: number, id: number, json: object): Buffer => {
  const body = Buffer.from(JSON.stringify(json), "utf8");
  const out = Buffer.alloc(13 + body.length);
  out.writeUInt32BE(9 + body.length, 0);
  out.writeUInt8(type, 4);
  out.writeUInt32BE(id, 5);
  out.writeUInt32BE(body.length, 9);
  body.copy(out, 13);
  return out;
};
