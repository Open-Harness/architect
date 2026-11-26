// #1151's hand-off, run for real: `src/main.ts` inside an app whose own `@orthograph/cli` is a stand-in script. A signal to the
// global `ortho` reaches the app's, which stops, and the global one ends by the same signal; an exit code comes back as it is;
// and the child is told it was handed to, so it never hands off again.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Names } from "orthograph/server";
import { afterEach, describe, expect, it } from "vitest";

const entry = resolve(import.meta.dirname, "../src/main.ts");
/** The hand-off mark, named as main.ts names it. */
const handedOff = Names.variable("HANDED_OFF");
const roots: Array<string> = [];
const pids: Array<number> = [];
afterEach(() => {
  for (const pid of pids.splice(0)) if (alive(pid)) process.kill(pid, "SIGKILL");
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

const alive = (pid: number): boolean => {
  try { process.kill(pid, 0); return true; } catch { return false; }
};
const until = async (ok: () => boolean, ms = 20_000) => {
  for (const start = Date.now(); !ok(); ) {
    if (Date.now() - start > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 50));
  }
};

/** An app whose `@orthograph/cli` is `script`, a stand-in that writes what it was given to `seen.json`. */
const app = (script: string) => {
  const root = mkdtempSync(join(tmpdir(), "ortho-handoff-run-"));
  roots.push(root);
  const cli = join(root, "node_modules/@orthograph/cli");
  mkdirSync(cli, { recursive: true });
  writeFileSync(join(cli, "package.json"), JSON.stringify({ name: "@orthograph/cli", bin: { ortho: "child.mjs" } }));
  writeFileSync(join(cli, "child.mjs"), `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(join(root, "seen.json"))}, JSON.stringify({ pid: process.pid, args: process.argv.slice(2), mark: process.env[${JSON.stringify(handedOff)}] ?? null }));\n${script}\n`);
  return root;
};
const run = (root: string, args: ReadonlyArray<string>) => {
  const env = { ...process.env };
  delete env[handedOff];
  const child = spawn("node", [entry, ...args], { cwd: root, env, stdio: "ignore" });
  pids.push(child.pid!);
  const ended = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((done) => child.on("exit", (code, signal) => done({ code, signal })));
  return { child, ended };
};
const seen = (root: string) => JSON.parse(readFileSync(join(root, "seen.json"), "utf8")) as { pid: number; args: Array<string>; mark: string | null };

describe("a global ortho that hands off", () => {
  it("passes SIGTERM to the app's ortho, which stops, and ends by SIGTERM itself", { timeout: 60_000 }, async () => {
    const root = app("setInterval(() => {}, 1000);");
    const { child, ended } = run(root, ["dev"]);
    await until(() => existsSync(join(root, "seen.json")));
    const { pid } = seen(root);
    pids.push(pid);
    child.kill("SIGTERM");
    expect(await ended).toEqual({ code: null, signal: "SIGTERM" });
    await until(() => !alive(pid));
    expect(alive(pid)).toBe(false);
  });

  it("gives the app's ortho the same arguments and comes back with its exit code", { timeout: 60_000 }, async () => {
    const root = app("process.exit(7);");
    const { ended } = run(root, ["check", "--root", "."]);
    expect(await ended).toEqual({ code: 7, signal: null });
    expect(seen(root).args).toEqual(["check", "--root", "."]);
    expect(seen(root).mark).toBe("1");
  });
});
