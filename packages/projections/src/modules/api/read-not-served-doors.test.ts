// ReadNotServed reaches every door through the one table the contract writes: the CLI's exit and line, the MCP tool's row and the SDK's
// error union all read `Errors.refusals`, `Errors.codes` and `Errors.wire`, never a list of names. A probe renders the contract for a model
// that has the refusal, runs it, and shows each door's input says what the doors read.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { api } from "./service.ts";
import { cli } from "../cli/service.ts";
import { sdk } from "../sdk/service.ts";
import { server } from "../server/service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const base = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), acme], { encoding: "utf8" })) as Model;
const model: Model = { ...base, refusals: { ...base.refusals, ReadNotServed: "AR-008" } };
const dir = mkdtempSync(join(import.meta.dirname, "probe-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("ReadNotServed at each door", () => {
  it("is in the contract's tables as the doors read them: code AR-008, exit 121, status 501, and a wire class", async () => {
    const errors = (await Effect.runPromise(api.render({ name: "acme", model, mount: "api", mounts: {} }))).find((f) => f.path === "src/errors.ts")!.content;
    const file = join(dir, "errors.ts");
    writeFileSync(file, errors.replace(/from "\.\.\//g, `from "${join(acme, "generated/api")}/`));
    const E = (await import(pathToFileURL(file).href)) as { refusals: Record<string, { code: string; exit: number; status: number }>; exits: Record<string, number>; codes: Record<string, string>; wire: Record<string, new (f: object) => { code: string }> };
    expect(E.refusals["ReadNotServed"]).toEqual({ code: "AR-008", exit: 121, status: 501 });
    expect(E.exits["ReadNotServed"]).toBe(121);
    expect(E.codes["ReadNotServed"]).toBe("AR-008");
    expect(new E.wire["ReadNotServed"]!({ read: "proposal.waiting", message: "m", code: "AR-008" }).code).toBe("AR-008");
  });

  it("is what the CLI exits with and prints, the MCP tool (through the server's table) describes and the SDK decodes: each reads the tables, by tag", async () => {
    const cliOut = (await Effect.runPromise(cli.render({ name: "acme", model, mount: "cli", mounts: {} }))).find((f) => f.path === "src/output.ts")!.content;
    expect(cliOut).toContain("tag in Errors.refusals ? Errors.refusals[tag as keyof typeof Errors.refusals].exit");
    expect(cliOut).toContain("tag in Errors.codes");
    const main = (await Effect.runPromise(server.render({ name: "acme", model, mount: "server", mounts: {} }))).find((f) => f.path.endsWith("main.ts"))!.content;
    expect(main).toContain("refusals: { codes: Errors.codes, declared: Errors.declared, table: Errors.refusals }");
    const sdkClient = (await Effect.runPromise(sdk.render({ name: "acme", model, mount: "sdk", mounts: {} }))).find((f) => f.path === "src/client.ts")!.content;
    expect(sdkClient).toContain("HttpApiClient");
  });
});
