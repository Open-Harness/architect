// Axiom as a sink: OTLP/HTTP straight from the Worker to the organisation's edge, a dataset per signal.
import { Effect } from "effect";
import type { Env, Reader } from "../types.ts";

/** What the Worker's `OTLP_SINKS` holds for one sink: one endpoint and its headers for each signal. */
export interface Exporter {
  readonly id: string;
  readonly traces: { readonly url: string; readonly headers: Readonly<Record<string, string>> };
  readonly logs: { readonly url: string; readonly headers: Readonly<Record<string, string>> };
  readonly metrics: { readonly url: string; readonly headers: Readonly<Record<string, string>> };
}

/** `capxul-test` is read from `capxul-ingest-test`, `capxul-real` from `capxul-ingest-real`: one token per group, by name. */
export const tokenService = (group: string): string => {
  const at = group.lastIndexOf("-");
  return at < 0 ? `${group}-ingest` : `${group.slice(0, at)}-ingest-${group.slice(at + 1)}`;
};

/** The edge domain from `AXIOM_DOMAIN` (CI) or the keychain's `axiom-domain`; a full URL is kept as it is (a stand-in). */
const baseOf = (domain: string): string => (domain.includes("://") ? domain.replace(/\/+$/, "") : `https://${domain}`);

export type Axiom =
  | { readonly kind: "ready"; readonly exporter: Exporter }
  | { readonly kind: "skipped"; readonly note: string };

/** One Axiom group's exporter, or why it is left out. Credentials are read here and only here. */
export const axiom = (group: string, env: Env, read: Reader): Effect.Effect<Axiom> =>
  Effect.gen(function* () {
    const service = tokenService(group);
    const token = env["AXIOM_TOKEN"] || (yield* read(service));
    if (!token) return { kind: "skipped", note: `axiom ${group}: skipped, no token (AXIOM_TOKEN, or the keychain item ${service})` } as const;
    const domain = env["AXIOM_DOMAIN"] || (yield* read("axiom-domain"));
    if (!domain) return { kind: "skipped", note: `axiom ${group}: skipped, no edge domain (AXIOM_DOMAIN, or the keychain item axiom-domain)` } as const;
    const base = baseOf(domain);
    const endpoint = (signal: "traces" | "logs" | "metrics") => ({
      url: `${base}/v1/${signal}`,
      headers: { authorization: `Bearer ${token}`, [signal === "metrics" ? "x-axiom-metrics-dataset" : "x-axiom-dataset"]: `${group}-${signal}` },
    });
    return { kind: "ready", exporter: { id: `axiom ${group}`, traces: endpoint("traces"), logs: endpoint("logs"), metrics: endpoint("metrics") } } as const;
  });
