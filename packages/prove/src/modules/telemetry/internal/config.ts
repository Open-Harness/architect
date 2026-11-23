// The Collector's config: written as a file next to what it writes, read from there by the process.

/** What a collector is started with: attribute keys to delete (L2.P), where it listens and where it writes. */
export interface CollectorOptions {
  readonly strip: ReadonlyArray<string>;
  readonly port: number;
  readonly dir: string;
}

/**
 * Every pipeline first drops the person the agent SDK's records name (`user.*`, `organization.id`), then, with `strip`
 * keys, deletes each from every span and log record (L2.P: the second guard behind the runtime's allowlist), before any
 * exporter sees it. The Collector's own metrics server is off: two collectors on one machine would fight for its port.
 * Keys are written as JSON strings, which YAML reads as the same string.
 */
export const collectorConfig = ({ strip, port, dir }: CollectorOptions) => {
  const chain = ["attributes/personal", "resource/personal", ...(strip.length > 0 ? ["attributes/private"] : [])];
  return [
    "receivers:", "  otlp:", "    protocols:", "      http:", `        endpoint: 127.0.0.1:${port}`,
    "processors:",
    "  attributes/personal:", "    actions:", "      - { pattern: '^(user\\..*|organization\\.id)$', action: delete }",
    "  resource/personal:", "    attributes:", "      - { pattern: '^(user\\..*|organization\\.id)$', action: delete }",
    ...(strip.length > 0 ? ["  attributes/private:", "    actions:", ...strip.flatMap((k) => [`      - key: ${JSON.stringify(k)}`, "        action: delete"])] : []),
    "exporters:",
    ...["traces", "logs", "metrics"].flatMap((signal) => [`  file/${signal}:`, `    path: ${JSON.stringify(`${dir}/${signal}.jsonl`)}`, "    flush_interval: 10ms"]),
    "service:", "  telemetry:", "    metrics:", "      level: none", "  pipelines:",
    ...["traces", "logs", "metrics"].map((signal) => `    ${signal}: { receivers: [otlp], processors: [${chain.join(", ")}], exporters: [file/${signal}] }`),
    "",
  ].join("\n");
};
