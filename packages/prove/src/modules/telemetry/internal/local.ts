import { appendFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import { Effect } from "effect";
import { CollectorFailed } from "../types.ts";
import { logsOf, spansOf } from "./otlp.ts";

/** The same file format and privacy guard as the collector, on a loopback port picked by the OS. */
export const listen = (dir: string, strip: ReadonlyArray<string>) =>
  Effect.callback<{ readonly server: Server; readonly url: string }, CollectorFailed>((resume) => {
    const privateKeys = new Set(strip);
    const server = createServer((request, response) => {
      const signal = request.url === "/v1/traces" ? "traces"
        : request.url === "/v1/logs" ? "logs"
        : request.url === "/v1/metrics" ? "metrics" : undefined;
      if (request.method !== "POST" || signal === undefined) {
        response.writeHead(404).end();
        return;
      }
      let body = "";
      let bytes = 0;
      const limit = 16 * 1024 * 1024;
      request.setEncoding("utf8").on("data", (chunk: string) => {
        bytes += Buffer.byteLength(chunk);
        if (bytes <= limit) body += chunk;
      }).on("end", () => {
        if (bytes > limit) {
          response.writeHead(413).end();
          return;
        }
        const parsed = Effect.runSync(Effect.result(Effect.try(() => {
          const doc = JSON.parse(body);
          if (signal === "traces") spansOf(doc);
          if (signal === "logs") logsOf(doc);
          return JSON.stringify(doc, (key, value) => key === "attributes" && Array.isArray(value)
            ? value.filter((attr) => typeof attr?.key === "string" && !privateKeys.has(attr.key) && !/^(user\.|organization\.id$)/.test(attr.key))
            : value);
        })));
        if (parsed._tag === "Failure") {
          response.writeHead(400).end();
          return;
        }
        const written = Effect.runSync(Effect.result(Effect.try(() => appendFileSync(join(dir, `${signal}.jsonl`), `${parsed.success}\n`))));
        response.writeHead(written._tag === "Success" ? 200 : 500, { "content-type": "application/json" }).end("{}");
      });
    });
    server.once("error", (error) => resume(Effect.fail(new CollectorFailed({ message: `the local collector couldn't listen: ${error.message}` }))));
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      resume(Effect.succeed({ server, url: `http://127.0.0.1:${port}` }));
    });
  });

export const close = ({ server }: { readonly server: Server }) =>
  Effect.callback<void>((resume) => {
    server.close(() => resume(Effect.void));
    server.closeAllConnections();
  });
