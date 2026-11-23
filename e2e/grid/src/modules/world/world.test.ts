// The real ports, tried on plain functions in place of the machine: what each is asked for, and what an output that is not there becomes.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { ServedPortals } from "../../../../served-portal/service.ts";
import { World } from "./service.ts";
import type { Primitives } from "./types.ts";

const pluggedIn = join(import.meta.dirname, "../../../../../examples/plugged-in");
const real = (path: string) => readFileSync(path, "utf8");

const node = (overrides: Partial<Primitives> = {}): Primitives => ({
  read: (path) => (path.startsWith(pluggedIn) ? real(path) : undefined),
  list: () => [],
  run: () => ({ status: 0, stdout: "help", stderr: "" }),
  remove: () => undefined,
  load: () => Promise.reject(new Error("no module")),
  ...overrides,
});
const ports = (primitives: Primitives) => World.ports({ project: pluggedIn, report: "/prove.json", telemetry: "/telemetry", node: primitives });

describe("the project's own files", () => {
  it("reads the model, and every generated file under generated/ by its path from the project", () => {
    const asked: Array<string> = [];
    const p = ports(node({ list: (dir) => { asked.push(dir); return ["docs/link/index.md", "gone.md"]; }, read: (path) => (path.endsWith("gone.md") ? undefined : real(path)) }));
    expect(Effect.runSync(p.generated)).toEqual({ "generated/docs/link/index.md": real(join(pluggedIn, "generated/docs/link/index.md")) });
    expect(asked).toEqual([join(pluggedIn, "generated")]);
    expect(Effect.runSync(p.model)?.operations["link.add"]?.name).toBe("link.add");
  });

  it("has no model when there is none, or when it is not JSON", () => {
    expect(Effect.runSync(ports(node({ read: () => undefined })).model)).toBeUndefined();
    expect(Effect.runSync(ports(node({ read: () => "{not json" })).model)).toBeUndefined();
  });
});

describe("the outputs the model does not hold", () => {
  it("asks the generated CLI `--help` for the words, in the project, and is silent when the command fails", () => {
    const ran: Array<ReadonlyArray<string>> = [];
    const ok = ports(node({ run: (cmd, args, cwd) => { ran.push([cmd, ...args, cwd]); return { status: 0, stdout: "USAGE", stderr: "" }; } }));
    expect(Effect.runSync(ok.cliHelp(["link", "add"]))).toBe("USAGE");
    expect(ran).toEqual([["npx", "tsx", "generated/cli/src/main.ts", "link", "add", "--help", pluggedIn]]);
    expect(Effect.runSync(ports(node({ run: () => ({ status: 1, stdout: "", stderr: "boom" }) })).cliHelp(["x"]))).toBeUndefined();
  });

  // K19: the portal's page is the one a browser draws from the served portal. A stand-in client draws a page from the data API.
  it("reads the portal's pages from the served portal in a browser, and a page that is not a 200 is undefined", async () => {
    const dir = mkdtempSync(join(tmpdir(), "grid-world-"));
    try {
      writeFileSync(join(dir, "index.html"), `<!doctype html><title>x</title><div id="r"></div><script>
fetch("/_portal/v1/blueprint").then((r) => r.json()).then(() => { const route = location.pathname.replace(/^\\/portal/, "");
document.getElementById("r").innerHTML = '<main data-portal="page" data-ready="true" data-status="' + (route.includes("fly") ? 404 : 200) + '"><h1>' + route + '</h1></main>'; });</script>`);
      const serve = { clientDir: dir, run: (effect: unknown) => effect as Promise<Response>, server: { PortalServer: { handle: () => Promise.resolve(Response.json({})) } } };
      const p = World.ports({ project: pluggedIn, report: "/prove.json", telemetry: "/telemetry", node: node(), serve });
      expect(await Effect.runPromise(p.portal("/portal/operations/link.add"))).toContain("<h1>/operations/link.add</h1>");
      expect(await Effect.runPromise(p.portal("/portal/operations/link.fly"))).toBeUndefined();
      expect(await Effect.runPromise(ports(node({ read: () => undefined })).portal("/portal"))).toBeUndefined();
    } finally { await ServedPortals.closeAll(); rmSync(dir, { recursive: true, force: true }); }
  });

  it("says why when the portal cannot be served (K19), once, and has no page", async () => {
    const said: Array<string> = [];
    const p = World.ports({ project: pluggedIn, report: "/prove.json", telemetry: "/telemetry", node: node(), serve: { clientDir: join(tmpdir(), "no-such-client") }, onUnavailable: (m) => said.push(m) });
    expect(await Effect.runPromise(p.portal("/portal"))).toBeUndefined();
    expect(await Effect.runPromise(p.portal("/portal/things/link"))).toBeUndefined();
    expect(said).toHaveLength(1);
    expect(said[0]).toMatch(/^K19: /);
  });

  it("answers `tools/list` as the MCP server does: from the project's own catalog and refusals, and nothing when they will not load", async () => {
    const tools = await Effect.runPromise(ports(node({ load: (path) => import(path) as Promise<Record<string, unknown>> })).mcpTools);
    expect(tools?.map((t) => t.name)).toEqual(Object.keys(JSON.parse(real(join(pluggedIn, "generated/model/model.json"))).operations));
    expect(tools?.find((t) => t.name === "link.add")?.description).toContain("Append a link");
    expect(await Effect.runPromise(ports(node()).mcpTools)).toBeUndefined();
  });

  it("has no spans when no prove run wrote any, and no report when there is none", () => {
    expect(Effect.runSync(ports(node()).spans)).toBeUndefined();
    expect(Effect.runSync(ports(node()).prove)).toBeUndefined();
    expect(Effect.runSync(ports(node({ read: () => JSON.stringify({ journeys: [], lines: ["x ✔"] }) })).prove)).toEqual({ journeys: [], lines: ["x ✔"] });
  });
});

describe("a fresh prove run", () => {
  // A disk the primitives share: a stale report and spans from an earlier run, and what prove does when it runs.
  const disk = (prove: (files: Map<string, string>) => { readonly status: number | null; readonly stdout: string; readonly stderr: string }) => {
    const files = new Map<string, string>([["/r.json", '{"stale":true}'], ["/telemetry/traces.jsonl", "stale"]]);
    const events: Array<string> = [];
    const primitives = node({
      read: (path) => files.get(path),
      list: (dir) => [...files.keys()].filter((k) => k.startsWith(`${dir}/`)).map((k) => k.slice(dir.length + 1)),
      remove: (path) => { events.push(`remove ${path}`); for (const key of files.keys()) if (key === path || key.startsWith(`${path}/`)) files.delete(key); },
      run: (...args) => { events.push(`run ${args[1]?.[1]}`); return prove(files); },
    });
    return { files, events, run: () => World.proveFresh({ repo: "/repo", project: "/p", report: "/r.json", telemetry: "/telemetry", node: primitives }) };
  };

  it("deletes the last report and spans before prove runs, so a prove that dies before writing leaves nothing to judge", () => {
    const d = disk(() => ({ status: 1, stdout: "", stderr: "the blueprint does not compile: handle.claim\nsecond line" }));
    const ran = d.run();
    expect(d.events).toEqual(["remove /r.json", "remove /telemetry", "run prove"]);
    expect(d.files.size).toBe(0);
    expect(ran.fresh).toBe(false);
    expect(ran.problems).toEqual(["prove wrote no report and no spans (status 1), so there is no run to judge: the blueprint does not compile: handle.claim / second line"]);
  });

  it("says so when prove printed nothing, or was killed (no status)", () => {
    expect(disk(() => ({ status: null, stdout: "", stderr: "" })).run().problems).toEqual(["prove wrote no report and no spans (status null), so there is no run to judge: it printed nothing"]);
  });

  it("is not a fresh run when prove wrote a report but never started its Collector, or died while loading journeys, before the report", () => {
    const noSpans = disk((files) => { files.set("/r.json", '{"journeys":[],"lines":[]}'); return { status: 0, stdout: "", stderr: "" }; }).run();
    expect(noSpans.fresh).toBe(false);
    expect(noSpans.problems[0]).toMatch(/^prove wrote no spans \(status 0\)/);
    const noReport = disk((files) => { files.set("/telemetry/traces.jsonl", "fresh"); return { status: 1, stdout: "", stderr: "loading journeys failed" }; }).run();
    expect(noReport.problems).toEqual(["prove wrote no report (status 1), so there is no run to judge: loading journeys failed"]);
  });

  it("is a fresh run when prove reports red journeys: the cells judge them", () => {
    const d = disk((files) => { files.set("/r.json", '{"journeys":[],"lines":[]}'); files.set("/telemetry/traces.jsonl", "fresh"); return { status: 1, stdout: "journey x ✘ 0/3 steps", stderr: "" }; });
    expect(d.run()).toMatchObject({ status: 1, fresh: true, problems: [] });
    expect(d.files.get("/r.json")).toBe('{"journeys":[],"lines":[]}');
  });
});
