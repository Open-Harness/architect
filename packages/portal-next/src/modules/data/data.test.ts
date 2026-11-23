import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Data } from "./service.ts";

const answer = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status });

afterEach(() => { vi.unstubAllGlobals(); });

describe("loaded", () => {
  it("reads the blueprint, then the snapshot for its digest", async () => {
    const asked: Array<string> = [];
    vi.stubGlobal("fetch", (request: string) => {
      asked.push(request);
      return Promise.resolve(answer(200, request.includes("snapshot") ? { telemetry: null } : { digest: "d 1" }));
    });
    const got = await Effect.runPromise(Data.loaded());
    expect(got.state).toBe("ready");
    expect(asked).toEqual(["/_portal/v1/blueprint", "/_portal/v1/snapshot?digest=d%201"]);
  });

  it("is a failed value naming the request, never a throw, when the API answers anything but 200", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(answer(500, {})));
    const got = await Effect.runPromise(Data.loaded());
    expect(got).toEqual({ state: "failed", failure: { _tag: "DataFailed", request: "/_portal/v1/blueprint", reason: "it answered 500" } });
  });
});

describe("store", () => {
  it("starts loading, and tells each listener once when it is settled", () => {
    const store = Data.store();
    let heard = 0;
    const stop = store.subscribe(() => { heard += 1; });
    expect(store.get()).toEqual({ state: "loading" });
    store.settle({ state: "failed", failure: { _tag: "DataFailed", request: "r", reason: "x" } });
    expect(heard).toBe(1);
    stop();
    store.settle({ state: "loading" });
    expect(heard).toBe(1);
  });
});
