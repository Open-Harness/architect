// The model stand-in as a process, on a real socket: scripted turns as SSE, a turn held open and let go, a cut connection, counts of what it was asked.
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const main = join(import.meta.dirname, "../../main.ts");
let child: ChildProcess;
let url = "";
let dir = "";

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "ortho-model-test-"));
  child = spawn(process.execPath, [main, "--port", "0", "--dir", dir], { stdio: ["ignore", "pipe", "inherit"] });
  url = await new Promise<string>((found, fail) => {
    let out = "";
    child.stdout!.on("data", (c: Buffer) => { out += c.toString(); const m = /^stand-in listening on (http:\/\/127\.0\.0\.1:\d+)$/m.exec(out); if (m) found(m[1]!); });
    child.once("exit", (code) => fail(new Error(`exited ${String(code)}`)));
  });
});
afterAll(async () => {
  const gone = new Promise((r) => child.once("exit", r));
  child.kill("SIGTERM");
  await gone;
  rmSync(dir, { recursive: true, force: true });
});

const command = (name: string, args: unknown = {}) => fetch(`${url}/_stand/${name}`, { method: "POST", body: JSON.stringify(args) }).then(async (r) => ({ status: r.status, body: (await r.json()) as Record<string, any> }));
const chat = (text: string, model = "executor") =>
  fetch(`${url}/v1/chat/completions`, {
    method: "POST", headers: { "content-type": "application/json", "x-orthograph-about": "ticket/tkt_1" },
    body: JSON.stringify({ model, stream: true, messages: [{ role: "user", content: text }], tools: [{ type: "function", function: { name: "bash" } }] }),
  });
const said = async (r: Response) => (await r.text()).split("\n\n").filter((l) => l.startsWith("data: {")).map((l) => JSON.parse(l.slice(6)).choices[0]);

describe("the model stand-in", () => {
  it("answers no script with 501, and counts the request", async () => {
    await command("reset");
    const r = await chat("anything");
    expect(r.status).toBe(501);
    expect((await command("seen")).body["requests"].map((q: { n: number; answered: string }) => [q.n, q.answered])).toEqual([[1, "no-script"]]);
  });

  it("streams a scripted tool call and then a scripted text, and `done` says every turn was used", async () => {
    await command("reset");
    await command("script", { for: { kind: "executor" }, turns: [{ call: [{ tool: "bash", args: { command: "echo one" } }] }, { say: "Added both." }] });
    expect((await command("done")).status).toBe(409);
    const first = await said(await chat("start"));
    expect(first[0].delta.tool_calls[0].function).toEqual({ name: "bash", arguments: '{"command":"echo one"}' });
    expect(first.at(-1).finish_reason).toBe("tool_calls");
    const second = await said(await chat("again"));
    expect(second[0].delta.content).toBe("Added both.");
    expect(await command("done")).toEqual({ status: 200, body: { unused: 0 } });
  });

  it("holds a turn open, shows it held, and lets it go; the model was asked once and `seen` finds what it was told", async () => {
    await command("reset");
    await command("script", { for: { kind: "executor" }, turns: [{ say: "late", hold: "before-reply" }] });
    const pending = chat("also the edge case");
    const held = await command("held", { match: { nth: 1 }, count: 1 });
    expect(held.body["held"]).toHaveLength(1);
    expect(held.body["held"][0]).toMatchObject({ n: 1, about: "ticket/tkt_1" });
    expect((await command("release", { hold: "all" })).body["released"]).toBe(1);
    expect((await said(await pending))[0].delta.content).toBe("late");
    expect((await command("seen", { containing: "edge case" })).body["requests"].map((q: { n: number }) => q.n)).toEqual([1]);
  });

  it("says what it saw when nothing was held in time, and drops a connection it was told to", async () => {
    await command("reset");
    const none = await command("held", { count: 1, waitMs: 100 });
    expect(none.status).toBe(408);
    await command("fail", { with: "reset" });
    await expect(chat("cut me")).rejects.toThrow();
    expect((await command("seen")).body["requests"].map((q: { answered: string }) => q.answered)).toEqual(["failed"]);
  });

  it("refuses a call to a tool the request did not offer, naming it", async () => {
    await command("reset");
    await command("script", { for: {}, turns: [{ call: [{ tool: "rm_everything", args: {} }] }] });
    const r = await chat("go");
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).toContain("ToolNotOffered: rm_everything");
    expect((await command("done")).body["unused"]).toBe(1);
  });
});
