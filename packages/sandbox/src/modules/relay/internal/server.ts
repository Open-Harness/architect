// The relay's loopback socket. A client proves it knows the sandbox's token before anything it sends goes further: its first line must
// equal the token (compared in constant time), within a few seconds. Only then does it take the one client slot, so a socket that
// connects and says nothing, or says the wrong thing, is closed and never blocks the real client. One client at a time.
import { timingSafeEqual } from "node:crypto";
import { createServer, type Server, type Socket } from "node:net";
import { Effect } from "effect";
import { DaemonFailed } from "../types.ts";
import { split } from "./frames.ts";

const AUTH_WITHIN_MS = 5_000;
const AUTH_LINE_MAX = 256;

export interface Listening {
  readonly server: Server;
  readonly port: number;
  /** The attached (authenticated) client's socket, if one is attached. */
  readonly client: () => Socket | undefined;
  /** Destroy every socket, authenticated or not. */
  readonly drop: () => void;
}

export interface Handlers {
  /** A client authenticated and took the slot: say hello to it (the relay writes the sync line). */
  readonly attached: (socket: Socket) => void;
  /** Whole frames from the attached client, in order. */
  readonly frames: (frames: ReadonlyArray<Buffer>) => void;
}

const sameToken = (presented: Buffer, token: string): boolean => {
  const expected = Buffer.from(token, "utf8");
  return presented.length === expected.length && timingSafeEqual(presented, expected);
};

export const listen = (token: string, handlers: Handlers): Effect.Effect<Listening, DaemonFailed> =>
  Effect.callback<Listening, DaemonFailed>((resume) => {
    let current: Socket | undefined;
    const all = new Set<Socket>();
    const server = createServer((socket) => {
      let line: Buffer<ArrayBufferLike> = Buffer.alloc(0);
      let pending: Buffer<ArrayBufferLike> = Buffer.alloc(0);
      let authenticated = false;
      all.add(socket);
      socket.on("error", () => undefined);
      socket.setTimeout(AUTH_WITHIN_MS, () => socket.destroy());
      socket.once("close", () => { all.delete(socket); if (current === socket) current = undefined; });
      const feed = (chunk: Buffer) => {
        const parsed = split(pending, chunk);
        pending = parsed.rest;
        if (parsed.frames.length > 0) handlers.frames(parsed.frames);
      };
      socket.on("data", (chunk: Buffer) => {
        if (authenticated) return feed(chunk);
        line = Buffer.concat([line, chunk]);
        const end = line.indexOf(0x0a);
        if (end < 0) return line.length > AUTH_LINE_MAX ? void socket.destroy() : undefined;
        const presented = line.subarray(0, end);
        const rest = line.subarray(end + 1);
        if (!sameToken(presented.at(-1) === 0x0d ? presented.subarray(0, -1) : presented, token) || current !== undefined) return void socket.destroy();
        authenticated = true;
        current = socket;
        socket.setTimeout(0);
        handlers.attached(socket);
        if (rest.length > 0) feed(rest);
      });
    });
    server.once("error", () => resume(Effect.fail(new DaemonFailed({ reason: "no loopback port was free for the sandbox's socket" }))));
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resume(address !== null && typeof address === "object" ? Effect.succeed({ server, port: address.port, client: () => current, drop: () => all.forEach((s) => s.destroy()) }) : Effect.fail(new DaemonFailed({ reason: "the sandbox's socket has no port" })));
    });
  });

/** Disconnect every client and stop listening; returns when the server has closed. */
export const unlisten = (listening: Listening): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    listening.server.close(() => resume(Effect.void));
    listening.drop();
  });
