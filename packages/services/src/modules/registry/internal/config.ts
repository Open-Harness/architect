// Verdaccio's config, written for one run: its storage in the run's folder, listening on loopback only.

const own = (pattern: string) => [`  '${pattern}':`, "    access: $all", "    publish: $all", "    unpublish: $all"];

export const registryConfig = (storage: string, port: number) => [
  "# Local registry: anyone may read, publish and unpublish the project's own names (@acme/*, acme) and Orthograph's, none of",
  "# which is ever proxied to npm (the unscoped `acme` exists there); everything else is proxied, so an install finds its dependencies.",
  `storage: ${JSON.stringify(storage)}`,
  `listen: 127.0.0.1:${port}`,
  "web: { enable: false }",
  "auth:", "  htpasswd:", `    file: ${JSON.stringify(`${storage}/htpasswd`)}`, "    max_users: 10",
  "uplinks:", "  npmjs:", "    url: https://registry.npmjs.org/",
  "    # An install asks for ~1000 packages at once; the defaults (30s, offline after 2 failures for 5m) turn one slow",
  "    # answer into 404s for everything not yet cached.",
  "    timeout: 120s", "    max_fails: 100", "    fail_timeout: 2s", "    agent_options:", "      keepAlive: true", "      maxSockets: 32",
  "packages:",
  ...["@acme/*", "acme", "orthograph", "@orthograph/*"].flatMap(own),
  "  '**':", "    access: $all", "    proxy: npmjs",
  "log: { type: stdout, format: pretty, level: warn }",
  "",
].join("\n");
