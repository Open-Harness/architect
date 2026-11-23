import { timingSafeEqual } from "node:crypto";
import { Effect } from "effect";
import type { SandboxesApi } from "../sandboxes/types.ts";
import { BadRequest, type BridgeFactory, type BridgeRequest, type BridgeResponse } from "./types.ts";
import { answer } from "./internal/answer.ts";
import * as decode from "./internal/decode.ts";

const MISSING: BridgeResponse = { status: 404, body: { ok: false, error: { name: "NotFound" } } };
const UNAUTHORIZED: BridgeResponse = { status: 401, body: { ok: false, error: { name: "Unauthorized" } } };

/** Constant time, so the secret cannot be found a character at a time. */
const presented = (given: string | undefined, secret: string): boolean => {
  const [a, b] = [Buffer.from(given ?? "", "utf8"), Buffer.from(secret, "utf8")];
  return a.length === b.length && timingSafeEqual(a, b);
};

export const Bridge: BridgeFactory = {
  of: (sandboxes: SandboxesApi, secret: string) => ({
    handle: (request: BridgeRequest): Effect.Effect<BridgeResponse> => {
      const { method, path, body } = request;
      if (!presented(request.secret, secret)) return Effect.succeed(UNAUTHORIZED);
      if (method === "GET" && path === "/_stand/health") return Effect.succeed({ status: 200, body: { ok: true, service: "sandbox" } });
      if (method !== "POST") return Effect.succeed(MISSING);
      switch (path) {
        case "/call/open": return answer(decode.open(body).pipe(Effect.flatMap(sandboxes.open)));
        case "/call/close": return answer(decode.sandboxOf(body).pipe(Effect.flatMap(sandboxes.close)));
        case "/call/exec": return answer(decode.exec(body).pipe(Effect.flatMap(sandboxes.exec)));
        case "/call/write": return answer(decode.write(body).pipe(Effect.flatMap(sandboxes.write)));
        case "/call/read": return answer(decode.read(body).pipe(Effect.flatMap(sandboxes.read)));
        case "/call/list": return answer(decode.tagOf(body).pipe(Effect.flatMap(sandboxes.list), Effect.map((list) => ({ sandboxes: list }))));
        case "/_stand/seen": return answer(decode.maybeSandbox(body).pipe(Effect.flatMap(sandboxes.seen), Effect.map((seen) => ({ sandboxes: seen }))));
        case "/_stand/left": return answer(sandboxes.left);
        case "/_stand/reset": return answer(sandboxes.sweep.pipe(Effect.as({})));
        default: return path.startsWith("/call/") ? answer(Effect.fail(new BadRequest({ what: `no such call: ${path}` }))) : Effect.succeed(MISSING);
      }
    },
  }),
};
