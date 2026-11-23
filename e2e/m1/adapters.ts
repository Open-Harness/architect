// What checks 03 and 04 share: an adapter mounted as `pricing`, an app operation that calls it as a step, the one blank
// its handler scaffold leaves (the error mapping), and a real HTTP server that holds and releases requests.
//
// Assumptions beyond M1-plugins (README.md lists them): the mount's default export carries `calls` (`pricing.calls.quote`);
// a call's error class is exported from the adapter's own blueprint folder (`blueprint/things/pricing/errors.js`); the
// scaffold of an operation with a `step.call` wires the callable by the payload's field names and leaves one
// `Handlers.blank(...)` standing where the failure is mapped to a declared error: `(failure: unknown) => <error>`.
import { createServer, type ServerResponse } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";
import { PORTS, mountFile, succeeds, textAt, writeMount } from "./support.ts";

export type Flavor = "promise" | "effect";
export const PACKAGE = { promise: "@fixture/remote", effect: "@fixture/effect-remote" } as const;
export const PRICING = "blueprint/adapters/pricing.ts";

/** `blueprint/adapters/pricing.ts`: the adapter mounted, reaching only what `include` names. */
export const mountPricing = (root: string, pkg: string = PACKAGE.promise, include = true) =>
  writeMount(root, "adapter", "pricing", { pkg, verbs: include ? ["p.include(p.calls.quote)"] : [] });

const probeThing = `import { Blueprint } from "orthograph";

export const Probe = Blueprint.thing({ description: "Exercises a mounted adapter.", fields: { id: Blueprint.id("prb") }, code: "PB" });
`;
const probeVerb = (pkg: string, flavor: Flavor) => `import { Blueprint, Schema } from "orthograph";
import { PriceUnavailable } from "${pkg}/blueprint/things/pricing/errors.js";
import pricing from "../../../adapters/pricing.ts";
import { Probe } from "../thing.ts";

export default Blueprint.operation(Probe, {
  description: "Call the mounted adapter.",
  payload: { ${flavor === "promise" ? 'origin: Blueprint.text({ max: 200 }), mode: Blueprint.value(Schema.Literals(["ok", "reject", "throw", "hold"]))'
    : 'mode: Blueprint.value(Schema.Literals(["ok", "fail", "defect", "interrupt"]))'} },
  answer: { value: Blueprint.text({ max: 100 }) },
  errors: [PriceUnavailable],
  allowed: [Blueprint.anyone],
  steps: { price: Blueprint.step.call(pricing.calls.quote) },
});
`;
/** The app's own operation `probe.quote`, which calls the adapter as a step. */
export const writeProbe = (root: string, pkg: string, flavor: Flavor) => {
  mkdirSync(join(root, "blueprint/things/probe/verbs"), { recursive: true });
  writeFileSync(join(root, "blueprint/things/probe/thing.ts"), probeThing);
  writeFileSync(join(root, "blueprint/things/probe/verbs/quote.ts"), probeVerb(pkg, flavor));
  writeFileSync(join(root, "blueprint/things/probe/errors.ts"), 'import { Blueprint } from "orthograph";\n\nexport class UnselectedRefusal extends Blueprint.error({}, { exit: 77 }) {}\n');
};

export type Mapper = "normal" | "defect" | "unselected";
const BLANK = /Handlers\.blank\((?:[^()]|\([^()]*\))*\)/;
/** Fill the scaffold's one blank, the error mapping, with a mapper to a declared error, a throw, or an undeclared error. */
export const fillMapper = (root: string, pkg: string, mapper: Mapper = "normal") => {
  const file = "src/probe/quote.ts";
  const text = textAt(root, file);
  expect(text.match(/Handlers\.blank\(/g), `${file} should have exactly one blank:\n${text}`).toHaveLength(1);
  const body = mapper === "defect" ? '(_failure: unknown) => { throw new Error("authored mapper defect"); }'
    : mapper === "unselected" ? "(_failure: unknown) => new UnselectedRefusal({})" : "(_failure: unknown) => new PriceUnavailable({})";
  const imports = [
    ...(mapper === "normal" && !text.includes("PriceUnavailable") ? [`import { PriceUnavailable } from "${pkg}/blueprint/things/pricing/errors.js";`] : []),
    ...(mapper === "unselected" ? ['import { UnselectedRefusal } from "../../blueprint/things/probe/errors.ts";'] : []),
  ];
  const filled = text.replace(BLANK, body);
  expect(filled).not.toContain("Handlers.blank");
  writeFileSync(join(root, file), [...imports, filled].join("\n"));
};

/** An adapter mounted, probed, generated, its blank filled, generated again. */
export const readyAdapter = (root: string, flavor: Flavor, mapper: Mapper = "normal") => {
  const pkg = PACKAGE[flavor];
  mountPricing(root, pkg);
  writeProbe(root, pkg, flavor);
  succeeds(root, "generate");
  fillMapper(root, pkg, mapper);
  succeeds(root, "generate");
};

// ---- the real HTTP service the Promise callable reaches ----

export interface Held { readonly origin: string; readonly state: () => Promise<{ held: number; aborted: number }> }
const json = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
};
/**
 * A server on 127.0.0.1 at `PORTS.hold`. `/hold` is answered only when `/release` is called; `/wait-held` is answered once a request
 * is held; `/reject` answers 503 with a private marker; `/state` counts what is held and what was dropped by its caller.
 */
export const withHold = async (use: (held: Held) => Promise<void>) => {
  const held = new Set<ServerResponse>();
  const waiters = new Set<ServerResponse>();
  let aborted = 0;
  const release = () => { for (const response of held) json(response, 200, { value: "released" }); held.clear(); };
  const server = createServer((request, response) => {
    if (request.url === "/hold") {
      held.add(response);
      response.on("close", () => { if (held.delete(response)) aborted += 1; });
      for (const waiter of waiters) json(waiter, 200, { held: 1 });
      waiters.clear();
      return;
    }
    if (request.url === "/wait-held") { if (held.size > 0) json(response, 200, { held: held.size }); else waiters.add(response); return; }
    if (request.url === "/release") { release(); json(response, 200, { released: true }); return; }
    if (request.url === "/state") return json(response, 200, { held: held.size, aborted });
    if (request.url === "/reject") return json(response, 503, { marker: "foreign-private-canary" });
    json(response, 200, { value: "ok" });
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(PORTS.hold, "127.0.0.1", resolve); });
  const origin = `http://127.0.0.1:${PORTS.hold}`;
  try {
    await use({ origin, state: async () => (await fetch(`${origin}/state`, { headers: { connection: "close" } })).json() as Promise<{ held: number; aborted: number }> });
  } finally {
    release();
    for (const waiter of waiters) waiter.destroy();
    await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); });
  }
};

export const logOf = (path: string) => readFileSync(path, "utf8");
export { mountFile };
