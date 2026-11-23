import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Sinks } from "./service.ts";

const TOKEN = "tok-for-the-test-only";
const keychain = (items: Record<string, string>) => (service: string) => Effect.succeed(items[service]);
const resolve = (sinks: Parameters<typeof Sinks.resolve>[0]["sinks"], env: Record<string, string | undefined>, items: Record<string, string>) =>
  Effect.runPromise(Sinks.resolve({ sinks, env, read: keychain(items) }));
const axiom = [{ sink: "local" }, { sink: "axiom", group: "capxul-test" }] as const;

describe("sinks", () => {
  it("names the token's keychain item from the group", () => {
    expect(Sinks.tokenService("capxul-test")).toBe("capxul-ingest-test");
    expect(Sinks.tokenService("capxul-real")).toBe("capxul-ingest-real");
    expect(Sinks.tokenService("capxul-agents")).toBe("capxul-ingest-agents");
  });

  it("reads the token and the edge domain by name, and builds an exporter per signal with its own dataset", async () => {
    const r = await resolve(axiom, {}, { "capxul-ingest-test": TOKEN, "axiom-domain": "eu.edge.example" });
    expect(r.notes).toEqual([]);
    expect(r.active).toEqual(["local", "axiom capxul-test"]);
    const [exporter] = JSON.parse(r.secretEnv["OTLP_SINKS"]!);
    expect(exporter.traces).toEqual({ url: "https://eu.edge.example/v1/traces", headers: { authorization: `Bearer ${TOKEN}`, "x-axiom-dataset": "capxul-test-traces" } });
    expect(exporter.logs.url).toBe("https://eu.edge.example/v1/logs");
    expect(exporter.logs.headers["x-axiom-dataset"]).toBe("capxul-test-logs");
    expect(exporter.metrics).toEqual({ url: "https://eu.edge.example/v1/metrics", headers: { authorization: `Bearer ${TOKEN}`, "x-axiom-metrics-dataset": "capxul-test-metrics" } });
  });

  it("lets AXIOM_TOKEN and AXIOM_DOMAIN override the keychain (CI), and keeps a full URL as it is (a stand-in)", async () => {
    const r = await resolve(axiom, { AXIOM_TOKEN: "ci-token", AXIOM_DOMAIN: "http://127.0.0.1:4999" }, { "capxul-ingest-test": TOKEN, "axiom-domain": "eu.edge.example" });
    const [exporter] = JSON.parse(r.secretEnv["OTLP_SINKS"]!);
    expect(exporter.traces.url).toBe("http://127.0.0.1:4999/v1/traces");
    expect(exporter.traces.headers.authorization).toBe("Bearer ci-token");
  });

  it("skips a sink with no token, with one line that names what was missing and never a value, and never fails", async () => {
    const r = await resolve(axiom, {}, {});
    expect(r.secretEnv).toEqual({});
    expect(r.active).toEqual(["local"]);
    expect(r.notes).toEqual(["axiom capxul-test: skipped, no token (AXIOM_TOKEN, or the keychain item capxul-ingest-test)"]);
    const noDomain = await resolve(axiom, {}, { "capxul-ingest-test": TOKEN });
    expect(noDomain.notes).toHaveLength(1);
    expect(noDomain.notes[0]).toContain("no edge domain");
    expect(JSON.stringify(noDomain)).not.toContain(TOKEN);
  });

  it("with no sinks beyond local, hands the world nothing secret", async () => {
    expect((await resolve([{ sink: "local" }], {}, { "capxul-ingest-test": TOKEN })).secretEnv).toEqual({});
  });
});
