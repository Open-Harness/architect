// The sender the fixture notification asks (fixtures/events/out/src/notification/invite.ts): a real HTTP server on
// 127.0.0.1, run by the check, that records every request. It sends no email. Its mode says what it answers: `up` 200,
// `down` 500, `hold` nothing until the check lets go (which it never does when it kills the world first: the request
// is simply dropped with the connection).
import { createServer, type ServerResponse } from "node:http";
import { freePorts } from "../ports.ts";

export type Mode = "up" | "down" | "hold";
export interface Hit { readonly at: number; readonly to: string; readonly cause: string }
export interface Sink {
  readonly url: string;
  readonly hits: ReadonlyArray<Hit>;
  readonly mode: (mode: Mode) => void;
  /** Resolves once a request is being held; rejects after `ms`. */
  readonly held: (ms?: number) => Promise<void>;
  readonly close: () => Promise<void>;
}

export const startSink = async (): Promise<Sink> => {
  const { sink: port } = freePorts("sink");
  const hits: Array<Hit> = [];
  const holding = new Set<ServerResponse>();
  const waiters = new Set<() => void>();
  let mode: Mode = "up";
  const server = createServer((request, response) => {
    const query = new URL(request.url ?? "/", "http://sink").searchParams;
    hits.push({ at: Date.now(), to: query.get("to") ?? "", cause: query.get("cause") ?? "" });
    if (mode === "hold") {
      holding.add(response);
      response.on("close", () => holding.delete(response));
      for (const wake of waiters) wake();
      return;
    }
    response.writeHead(mode === "up" ? 200 : 500).end();
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  return {
    url: `http://127.0.0.1:${port}`,
    hits,
    mode: (next) => { mode = next; },
    held: (ms = 60_000) => holding.size > 0 ? Promise.resolve() : new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no request was held within ${ms} ms`)), ms);
      waiters.add(() => { clearTimeout(timer); resolve(); });
    }),
    close: () => new Promise<void>((resolve) => { for (const r of holding) r.destroy(); server.close(() => resolve()); server.closeAllConnections(); }),
  };
};
