// A real HTTP server that plays the Worker for M1.23's checks: it records every write it accepts, and answers a refusal
// with 422 and a failure with 500 as the generated SDK's callers see them. What a check reads is `writes`, the server's
// own record, never a return value: a call that was refused must leave nothing in it.
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export interface Write {
  readonly path: string;
  readonly body: Record<string, unknown>;
  readonly requestKey: string | undefined;
}

export interface Worker {
  readonly url: string;
  readonly writes: Write[];
  /** Resolves after one more round trip, so a request sent before the call is handled before it returns. */
  readonly settle: () => Promise<void>;
  readonly close: () => Promise<void>;
}

/** The secret a defect carries, so a check can see it never reaches the caller. */
export const SECRET = "postgres://admin:hunter2@db.internal/notes";

const readBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    let text = "";
    req.on("data", (chunk: Buffer) => (text += chunk.toString("utf8")));
    req.on("end", () => resolve(text === "" ? {} : (JSON.parse(text) as Record<string, unknown>)));
  });

/** Starts the Worker on a free port. Role `editor` may write; any other role is refused by the role check, writing nothing. */
export const startWorker = async (): Promise<Worker> => {
  const writes: Write[] = [];
  const server: Server = createServer((req, res) => {
    const reply = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    void readBody(req).then((body) => {
      const path = req.url ?? "";
      if (path === "/notes/list") {
        return reply(200, { notes: writes.filter((w) => w.path === "/notes/add" && w.body.room === body.room).map((w) => w.body.text) });
      }
      if (path === "/notes/export") return reply(500, { message: `connection to ${SECRET} refused` });
      if (req.headers["x-role"] !== "editor") return reply(422, { _tag: "NotAllowed" });
      if (path === "/notes/add" && body.room === "full") return reply(422, { _tag: "RoomFull", code: "NT-001", remaining: 0 });
      const key = req.headers["x-request-key"];
      writes.push({ path, body, requestKey: typeof key === "string" ? key : undefined });
      return reply(200, { ok: true, count: writes.length });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    writes,
    settle: async () => {
      await fetch(`http://127.0.0.1:${port}/notes/list`, { method: "POST", body: "{}" }).then((r) => r.text());
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
};
