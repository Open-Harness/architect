// Check 45 (M1.51, K28): the dry run sends nothing, and its file lists are npm's. The command and its output: `npm-preview.ts`, the top of the file.
//  (d) NOTHING IS SENT. Every run is loaded with `deny-network.mjs` (a connection to a host that is not this machine ends the process with `NETWORK-DENIED <host>`), and
//      holds a decoy npm token for npmjs and for the local registry. Against npmjs the dry run makes no connection at all, passes or fails. Against a registry that writes down
//      every request, it sends no PUT, POST or DELETE, carries no token, and the token is never printed. Without `--dry-run` it publishes nothing and exits 2: a real publish is
//      Aaron's, signed in. The real-publish path of `ortho publish` against a local registry is the existing publish tests' (`packages/prove`, `e2e/layer2/04-promotion`) and stays as it is.
//  (e) THE FILES. Each block's files are what `npm pack --dry-run` puts in that package's tarball (sorted equal, and the count says how many); a planted `src/*.test.ts`,
//      `expected-failing/`, `test/` and `.env` outside `files` are never listed, and no package of the repository lists one.
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";
import { repo } from "./support.ts";
import { DECOY, GOOD, NPMJS, blocks, cleanup, packed, preview, previewAsync, publicOf, recorder, shimmed, unlicensed, without, workspace, type Ran } from "./npm-preview.ts";

afterAll(cleanup);
const dryAsync = (root: string, ...more: ReadonlyArray<string>) => previewAsync(["--dry-run", "--root", root, ...more]);
const dry = (root: string, ...more: ReadonlyArray<string>) => preview(["--dry-run", "--root", root, ...more]);
const lines = (ran: Ran) => ran.all.split("\n").filter((l) => l.trim() !== "").slice(0, 4).join(" | ").slice(0, 300);
const WRITES = /^(PUT|POST|DELETE|PATCH)$/;

describe("45 controls: the instruments see", () => {
  it("the guard ends a connection to another host, and lets this machine be", () => {
    const run = (host: string) => spawnSync(process.execPath, ["--import", new URL("./deny-network.mjs", import.meta.url).pathname, "-e", `fetch("http://${host}/").then(()=>process.exit(0),()=>process.exit(3))`], { encoding: "utf8", timeout: 20_000 });
    expect(run("guard-probe.invalid").stderr).toContain("NETWORK-DENIED guard-probe.invalid");
    expect(run("127.0.0.1:9").stderr).not.toContain("NETWORK-DENIED");
  });
  it("the recorder hears a PUT and a GET, and the token it is offered", async () => {
    const reg = await recorder();
    try {
      await fetch(`${reg.url}x`, { method: "PUT", headers: { authorization: `Bearer ${DECOY}` }, body: "{}" });
      await fetch(`${reg.url}x`);
      expect(reg.heard.map((h) => h.method)).toEqual(["PUT", "GET"]);
      expect(reg.heard[0]!.authorization).toContain(DECOY);
    } finally { await reg.close(); }
  });
  it("npm pack lists a planted test when `files` asks for it, so the oracle can see one", () => {
    const root = workspace(GOOD);
    const alpha = publicOf(root).find((m) => m.name === "@orthograph/alpha")!;
    expect(packed(alpha.dir)).toEqual(["README.md", "dist/index.d.ts", "dist/index.js", "package.json", "src/index.ts"]);
    const wide = workspace([{ ...GOOD[2]!, files: ["dist", "src"] }]);
    expect(packed(publicOf(wide)[0]!.dir)).toContain("src/index.test.ts");
  });
});

describe("45 (d) nothing is sent", () => {
  it("against npmjs, a passing run, a failing one, a refused tag and the repository's own make no connection at all", () => {
    const runs: Array<[string, Ran, number]> = [
      ["passing", dry(workspace(GOOD)), 0],
      ["bad licence", dry(workspace(without(GOOD, "orthograph", "drop-license"))), 1],
      ["refused tag", dry(workspace(GOOD), "--registry", NPMJS, "--tag", "latest"), 1],
      ["the repository", preview(["--dry-run"]), -1],
    ];
    for (const [what, ran, status] of runs) {
      expect(ran.all, what).not.toContain("NETWORK-DENIED");
      expect(ran.status, `${what}: ${lines(ran)}`).not.toBe(97);
      if (status >= 0) expect(ran.status, `${what}: ${lines(ran)}`).toBe(status);
      expect(blocks(ran.out).length > 0 || ran.all.includes("refused:"), `${what}: it printed nothing and refused nothing: ${lines(ran)}`).toBe(true);
    }
  });
  it("against a registry that records, it sends no write and no token, and prints no token", async () => {
    const reg = await recorder();
    try {
      for (const root of [workspace(GOOD), workspace(without(GOOD, "orthograph", "drop-license"))]) {
        const ran = await dryAsync(root, "--registry", reg.url, "--tag", "latest");
        expect(ran.all).not.toContain(DECOY);
        expect(ran.all).not.toContain("NETWORK-DENIED");
      }
      expect(reg.heard.filter((h) => WRITES.test(h.method)), JSON.stringify(reg.heard)).toEqual([]);
      expect(reg.heard.filter((h) => h.authorization !== undefined)).toEqual([]);
      expect(reg.heard.filter((h) => /-\/(user|v1\/login|npm\/v1\/user|whoami)/.test(h.url))).toEqual([]);
    } finally { await reg.close(); }
  });
  it("without --dry-run it publishes nothing, prints a usage line and exits 2", async () => {
    const reg = await recorder();
    try {
      for (const args of [[], ["--registry", reg.url], ["--registry", NPMJS, "--tag", "next"]]) {
        const ran = await previewAsync(["--root", workspace(GOOD), ...args]);
        expect(ran.status, `${args.join(" ")}: ${lines(ran)}`).toBe(2);
        expect(ran.all).toMatch(/usage/i);
        expect(ran.all).not.toContain("NETWORK-DENIED");
        expect(ran.all).not.toContain(DECOY);
        expect(blocks(ran.out)).toEqual([]);
      }
      expect(reg.heard).toEqual([]);
    } finally { await reg.close(); }
  });
});

describe("45 (e) the files are npm's", () => {
  it("every package of the repository lists the files npm pack --dry-run would send, and none is a test, an expected-failing list or a .env", () => {
    const ran = preview(["--dry-run"]);
    const got = blocks(ran.out);
    expect(got.length, lines(ran)).toBe(publicOf(repo).length);
    for (const m of publicOf(repo)) {
      const b = got.find((x) => x.name === m.name);
      expect(b, `${m.name} is not listed: ${lines(ran)}`).toBeDefined();
      // Goal 18 slice 5 (check 47): the files are the ones pnpm would publish. Two things differ from npm's list: the preset carries the starter (files/), and a package whose
      // `publishConfig.bin` rewrites its `bin` (the cli, the compiler) no longer ships the source file npm adds for the old one.
      const wasBin = (): ReadonlyArray<string> => { const x = m as unknown as { bin?: string | Record<string, string>; publishConfig?: { bin?: unknown } }; return x.publishConfig?.bin === undefined || x.bin === undefined ? [] : (typeof x.bin === "string" ? [x.bin] : Object.values(x.bin)).map((f) => f.replace(/^\.\//, "")); };
      const kept = (f: string) => !(m.name === "@orthograph/preset" && f.startsWith("files/")) && !wasBin().includes(f);
      expect([...b!.files].filter(kept).sort(), m.name).toEqual(packed(m.dir).filter(kept));
      expect(b!.count, m.name).toBe(b!.files.length);
      expect(b!.files.filter((f) => /(^|\/)src\/.*\.test\.ts$|(^|\/)expected-failing\/|(^|\/)\.env/.test(f)), m.name).toEqual([]);
    }
  });
  it("a fixture with a test, an expected-failing list, a test folder and a .env beside its dist lists none of them, and each package its own files", () => {
    const root = workspace(GOOD);
    const ran = dry(root);
    expect(ran.status, lines(ran)).toBe(0);
    const got = blocks(ran.out);
    expect(got.length).toBe(3);
    for (const m of publicOf(root)) {
      const b = got.find((x) => x.name === m.name);
      expect(b, m.name).toBeDefined();
      expect([...b!.files].sort(), m.name).toEqual(packed(m.dir));
      expect(b!.count, m.name).toBe(b!.files.length);
    }
    expect(got.flatMap((b) => b.files).filter((f) => /test|expected-failing|\.env/.test(f))).toEqual([]);
    expect(got.find((b) => b.name === "@orthograph/preset")?.files).toContain("generators.json");
    expect(got.find((b) => b.name === "@orthograph/alpha")?.files).toContain("src/index.ts");
    expect(got.find((b) => b.name === "orthograph")?.files).not.toContain("src/index.ts");
    expect(unlicensed(ran.all)).toEqual([]);
  });
});

describe("45 last: nothing but Node ran", () => {
  it("no curl, wget, nc, ssh, python or gh was run by any command above", () => { expect(shimmed()).toBe(""); });
});
