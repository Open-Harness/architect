// The operation row's evals over Plugged In's real model and outputs (its checked-in `generated/`, the portal rendered over its blueprint, and the
// CLI help, MCP tools, spans and prove report of a real run), and over acme's. The same suite runs for every operation the model has:
// nothing here is `handle.claim`'s alone.
import { describe, expect, it } from "vitest";
import { editFile, editPortal, editSpans, evidenceOf, judge, withoutProveLine } from "../project-evidence/testing.ts";
import { OperationEvals } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");
const ops = Object.keys(pluggedIn.model.operations);
const check = (cell: string, subject: string, evidence = pluggedIn) => judge(OperationEvals.evals, `operation.${cell}`, subject, evidence);

describe("Plugged In, as captured on 19 November 2026 (fixtures/plugged-in)", () => {
  it("has seven operations, so the suites below are not empty", () => {
    expect(ops.length).toBe(7);
  });

  it.each(["model", "api", "server", "sdk", "mcp", "docs", "telemetry"])("operation.%s is green for every operation", (cell) => {
    for (const op of ops) expect({ op, ...check(cell, op) }).toEqual({ op, ok: true, why: [] });
  });

  it("operation.cli is red for every operation: its --help carries no description (generators render/internal/cli.ts)", () => {
    for (const op of ops) {
      const found = check("cli", op);
      expect(found.ok, op).toBe(false);
      expect(found.why[0], op).toMatch(/--help` does not carry the operation's description/);
    }
  });

  it("operation.portal is red for every operation: home's matrix has no calls, refused, defects or p95 (the portal reads no telemetry, M1.13)", () => {
    for (const op of ops) expect(check("portal", op).why, op).toEqual(["Calls", "Refused", "Defects", "p95"].map((c) => `home's operations matrix has no ${c} column: the portal does not yet count calls from telemetry (M1.13)`));
  });
});

describe("acme, from its checked-in outputs", () => {
  it("passes what its files and portal say, for every operation it has", () => {
    for (const op of Object.keys(acme.model.operations)) {
      for (const cell of ["model", "api", "sdk", "docs"]) expect({ op, cell, ...check(cell, op, acme) }).toEqual({ op, cell, ok: true, why: [] });
    }
  });
  it("is red where no run was read, and says so", () => {
    expect(check("server", "allowance.spend", acme).why[0]).toMatch(/no prove run was read/);
    expect(check("telemetry", "allowance.spend", acme).why).toEqual(["no spans were read from the prove run"]);
    expect(check("cli", "allowance.spend", acme).why[0]).toMatch(/could not be run through the generated CLI/);
    expect(check("mcp", "allowance.spend", acme).why).toEqual(["the MCP server's tools/list could not be read"]);
  });
});

describe("a wrong output is red, and says what", () => {
  it("a subject the model does not have", () => {
    expect(check("model", "handle.fly")).toEqual({ ok: false, why: ["the model has no operation handle.fly"] });
  });

  it("model: an operation with no description, nobody allowed and no budget", () => {
    const { budget: _kept, ...withoutBudget } = pluggedIn.model.operations["link.add"]!;
    const broken = { ...pluggedIn, model: { ...pluggedIn.model, operations: { ...pluggedIn.model.operations, "link.add": { ...withoutBudget, description: "", allowed: [] } } } };
    expect(check("model", "link.add", broken).why).toEqual(["it has no description", "it says nobody may call it (allowed is empty)", "it declares no p95 budget"]);
  });

  it("api: a missing endpoint, another path, a refusal the endpoint does not list, and a missing table row", () => {
    expect(check("api", "link.remove", editFile(pluggedIn, "generated/api/src/link/remove.ts", () => "")).why[0]).toMatch(/has no endpoint "remove" at \/link\/remove/);
    expect(check("api", "link.remove", editFile(pluggedIn, "generated/api/src/link/remove.ts", (t) => t.replace("[LinkNotListed, NotAllowed]", "[NotAllowed]"))).why).toEqual(["generated/api/src/link/remove.ts lists errors [NotAllowed], the model gives [LinkNotListed, NotAllowed]"]);
    expect(check("api", "link.remove", editFile(pluggedIn, "generated/api/src/index.ts", (t) => t.replace('"link.remove":', '"link.rm":'))).why).toEqual(['generated/api/src/index.ts\'s operations table has no "link.remove"']);
    expect(check("api", "link.remove", { ...pluggedIn, files: { ...pluggedIn.files, "generated/api/src/link/remove.ts": undefined as never } }).why[0]).toMatch(/was not generated/);
  });

  it("server: a prove check that did not print a tick, and a call that left no span", () => {
    expect(check("server", "link.order", withoutProveLine(pluggedIn, "link.order who may call")).why).toEqual(['prove did not report "link.order who may call ✔"']);
    expect(check("server", "link.order", editSpans(pluggedIn, (s) => s.filter((x) => x.name !== "link.order"))).why).toEqual(["no span named link.order: the call was never served and traced"]);
  });

  it("sdk: a function that lost its doc comment, one the group does not export", () => {
    expect(check("sdk", "link.add", editFile(pluggedIn, "generated/sdk/src/link/add.ts", (t) => t.replace(/\/\*\*[^\n]*\*\/\n/, ""))).why[0]).toMatch(/does not export add under the doc comment/);
    expect(check("sdk", "link.add", editFile(pluggedIn, "generated/sdk/src/link/index.ts", (t) => t.replace('export { add } from "./add.ts";\n', ""))).why).toEqual(["the link group does not export add from ./add.ts"]);
  });

  it("cli: a command that carries the description passes; one the group does not list is red", () => {
    const description = pluggedIn.model.operations["link.remove"]!.description!;
    const help = { ...pluggedIn.cli, "link remove": `plugged-in link remove\n\n${description}\n`, link: "USAGE\n\nSUBCOMMANDS\n  add       \n  order     \n" };
    expect(check("cli", "link.remove", { ...pluggedIn, cli: help }).why).toEqual(["`link --help` lists no subcommand remove"]);
    expect(check("cli", "link.remove", { ...pluggedIn, cli: { ...help, link: `${help.link}  remove    \n` } })).toEqual({ ok: true, why: [] });
  });

  it("mcp: another description, a read marked as an operation, and a missing tool", () => {
    const tools = pluggedIn.mcp!;
    expect(check("mcp", "link.add", { ...pluggedIn, mcp: tools.map((t) => (t.name === "link.add" ? { ...t, description: "Does something" } : t)) }).why[0]).toMatch(/^the tool says "Does something", the model says "Append a link/);
    expect(check("mcp", "link.add", { ...pluggedIn, mcp: tools.map((t) => (t.name === "link.add" ? { ...t, annotations: { readOnlyHint: true } } : t)) }).why[0]).toMatch(/is marked read-only, but the model's link.add is an operation/);
    expect(check("mcp", "link.add", { ...pluggedIn, mcp: tools.filter((t) => t.name !== "link.add") }).why).toEqual(["tools/list has no tool link.add"]);
  });

  it("docs: a missing heading, budget and refusal row, and an extra payload field", () => {
    const path = "generated/docs/link/order.md";
    expect(check("docs", "link.order", editFile(pluggedIn, path, (t) => t.replace("**Budget:** p95 150ms.", "**Budget:** p95 999ms."))).why).toEqual(['generated/docs/link/order.md does not show the budget "p95 150ms"']);
    expect(check("docs", "link.order", editFile(pluggedIn, path, (t) => t.replace("| position | LinkPosition |", "| position | LinkPosition |\n| bonus | x |"))).why).toEqual(["the Payload table shows bonus, which the model does not declare"]);
    expect(check("docs", "link.order", editFile(pluggedIn, path, (t) => t.replace(/\| LinkAlreadyRemoved[^\n]*\n/, ""))).why).toEqual(["the Refusals table leaves out LinkAlreadyRemoved"]);
    expect(check("docs", "link.order", editFile(pluggedIn, path, (t) => t.replace("# link.order", "# link.reorder"))).why[0]).toMatch(/has no heading "# link.order"/);
  });

  it("docs: it judges what the page says, not its length: an idempotent operation must say so", () => {
    expect(check("docs", "handle.claim", editFile(pluggedIn, "generated/docs/handle/claim.md", (t) => t.replace(/\*\*Idempotent by[^\n]*\n\n/, ""))).why[0]).toMatch(/does not state idempotency/);
  });

  it("portal: a page that only carries the docs is red; the embedded docs prove nothing", () => {
    const route = "/portal/operations/link.order";
    const docsOnly = (html: string) => html.slice(html.indexOf("<h2>Docs</h2>"));
    const found = check("portal", "link.order", editPortal(pluggedIn, route, docsOnly));
    expect(found.why.slice(0, 3)).toEqual(["/portal/operations/link.order has no heading link.order", "/portal/operations/link.order does not carry the description", "/portal/operations/link.order's contract does not say who may call"]);
  });

  it("telemetry: a span with no attempt, a call nothing timed, and no span at all", () => {
    expect(check("telemetry", "link.order", editSpans(pluggedIn, (s) => s.map((x) => (x.name === "link.order" ? { ...x, attrs: { ...x.attrs, attempt: undefined } } : x)))).why).toEqual(["a link.order span has no attempt"]);
    expect(check("telemetry", "link.order", { ...pluggedIn, prove: { ...pluggedIn.prove!, lines: pluggedIn.prove!.lines.map((l) => (l.startsWith("link.order performance") ? "link.order performance ✔ no timed calls" : l)) } }).why).toEqual(["link.order has no measured duration (performance ✔ no timed calls): ortho.call.duration recorded nothing"]);
    expect(check("telemetry", "link.order", editSpans(pluggedIn, (s) => s.filter((x) => x.name !== "link.order"))).why).toEqual(["no span named link.order carries operation=link.order"]);
  });
});
