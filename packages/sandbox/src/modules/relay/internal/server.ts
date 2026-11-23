// The relay's loopback socket: one client at a time; a second connection is closed at once.
import { createServer, type Server, type Socket } from "node:net";
import { Effect } from "effect";
import { DaemonFailed } from "../types.ts";

export interface Listening {
  readonly server: Server;
  readonly port: number;
  /** The attached client's socket, if one is attached. */
  readonly client: () => Socket | undefined;
}

export interface Handlers {
  /** A client attached: say hello to it (the relay writes the sync line). */
  readonly attached: (socket: Socket) => void;
  readonly data: (chunk: Buffer) => void;
}

export const listen = (handlers: Handlers): Effect.Effect<Listening, DaemonFailed> =>
  Effect.callback<Listening, DaemonFailed>((resume) => {
    let current: Socket | undefined;
    const server = createServer((socket) => {
      if (current !== undefined) return void socket.destroy();
      current = socket;
      socket.on("error", () => undefined);
      socket.on("data", handlers.data);
      socket.once("close", () => { if (current === socket) current = undefined; });
      handlers.attached(socket);
    });
    server.once("error", () => resume(Effect.fail(new DaemonFailed({ reason: "no loopback port was free for the sandbox's socket" }))));
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resume(address !== null && typeof address === "object" ? Effect.succeed({ server, port: address.port, client: () => current }) : Effect.fail(new DaemonFailed({ reason: "the sandbox's socket has no port" })));
    });
  });

/** Disconnect the client and stop listening; returns when the server has closed. */
export const unlisten = (listening: Listening): Effect.Effect<void> =>
  Effect.callback<void>((resume) => {
    listening.client()?.destroy();
    listening.server.close(() => resume(Effect.void));
  });
