// Run by `device-journeys.test.ts` in a plain Node process (vitest loads a module twice under two names, and a journey must
// import the very declaration objects the loader did): the wallet plugin's own journeys through prove's device path, on a
// copy of acme with the built @orthograph/wallets mounted, a real Anvil as the world's chain and a real workerd world.
// Telemetry goes to a receiver of this file's own that writes what the Collector's file exporter writes (the Collector
// itself is a process, since M1.33), so prove's whole `exercise` runs: the journeys, the traces read back, the nine evals.
// Prints one line, `RESULT <json>`.
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@orthograph/compiler";
import { Journeys } from "../src/modules/journeys/service.ts";
import { closing, exercise } from "../src/modules/prove/internal/exercise.ts";
import { deviceHost, standChain } from "../src/modules/prove/internal/device-host.ts";
import { FileSource } from "../src/modules/telemetry/service.ts";
import { handlerHashes } from "../src/modules/verdicts/internal/proof.ts";
import { Worlds } from "../src/modules/world/service.ts";

const repo = resolve(import.meta.dirname, "../../..");
/** `wallets`: the real @orthograph/wallets. `standin`: e2e check 09's stand-in, whose world entries are empty. */
const mode = process.argv[2] === "standin" ? "standin" : "wallets";
const plugin = mode === "standin" ? "@fixture/wallets" : "@orthograph/wallets";
const acme = join(repo, "examples/acme");

/** The stand-in built as `e2e/m1/packages.ts` builds a fixture (tsc declarations, esbuild per file), and linked into the project. */
const installStandin = (parent: string, root: string) => {
  const work = join(parent, "fixture-build");
  mkdirSync(join(work, "node_modules/@orthograph"), { recursive: true });
  cpSync(join(repo, "e2e/fixtures/m1/wallets"), work, { recursive: true });
  rmSync(join(work, "variants"), { recursive: true, force: true });
  symlinkSync(join(repo, "packages/orthograph"), join(work, "node_modules/orthograph"));
  symlinkSync(join(repo, "packages/language-effect"), join(work, "node_modules/@orthograph/language-effect"));
  symlinkSync(join(repo, "node_modules/effect"), join(work, "node_modules/effect"));
  symlinkSync(join(repo, "node_modules/@types"), join(work, "node_modules/@types"));
  writeFileSync(join(work, "tsconfig.json"), JSON.stringify({ extends: join(repo, "tsconfig.base.json"), compilerOptions: { noEmit: false, declaration: true, emitDeclarationOnly: true, rootDir: "source", outDir: "dist", types: ["node"] }, include: ["source/**/*.ts"] }));
  const tsc = spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", join(work, "tsconfig.json")], { cwd: work, encoding: "utf8" });
  if (tsc.status !== 0) throw new Error(`tsc on the stand-in:\n${tsc.stdout}${tsc.stderr}`);
  const sources = spawnSync("find", ["source", "-name", "*.ts"], { cwd: work, encoding: "utf8" }).stdout.trim().split("\n");
  const built = spawnSync(join(repo, "packages/prove/node_modules/.bin/esbuild"), [...sources, "--format=esm", "--platform=neutral", "--outbase=source", "--outdir=dist", "--log-level=warning"], { cwd: work, encoding: "utf8" });
  if (built.status !== 0) throw new Error(`esbuild on the stand-in:\n${built.stderr}`);
  mkdirSync(join(root, "node_modules/@fixture"), { recursive: true });
  symlinkSync(work, join(root, "node_modules/@fixture/wallets"));
};

/** acme in a folder of its own, with the built @orthograph/wallets installed and mounted by hand, and generated. */
const walletProject = (parent: string) => {
  const root = join(parent, "acme");
  for (const part of ["ortho.config.ts", "blueprint", "generated", "src", "journeys", "package.json"]) {
    cpSync(join(acme, part), join(root, part), { recursive: true, filter: (from) => !basename(from).startsWith(".") });
  }
  mkdirSync(join(root, "node_modules/@orthograph"), { recursive: true });
  for (const entry of readdirSync(join(acme, "node_modules")).filter((e) => e !== ".bin" && e !== "@orthograph")) symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
  for (const entry of readdirSync(join(acme, "node_modules/@orthograph"))) symlinkSync(join(acme, "node_modules/@orthograph", entry), join(root, "node_modules/@orthograph", entry));
  if (mode === "wallets") symlinkSync(join(repo, "packages/wallets"), join(root, "node_modules/@orthograph/wallets"));
  else installStandin(parent, root);
  mkdirSync(join(root, "node_modules/.bin"));
  for (const tool of ["tsc", "oxlint"]) writeFileSync(join(root, "node_modules/.bin", tool), `#!/bin/sh\nexec "${join(repo, "node_modules/.bin", tool)}" "$@"\n`, { mode: 0o755 });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: join(acme, "tsconfig.json"), include: ["blueprint/**/*.ts", "generated/**/*.ts", "src/**/*.ts", "journeys/**/*.ts"] }));
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies: Record<string, string> };
  writeFileSync(join(root, "package.json"), JSON.stringify({ ...manifest, dependencies: { ...manifest.dependencies, [plugin]: mode === "standin" ? "1.0.0" : "0.0.0" } }, null, 2));
  mkdirSync(join(root, "blueprint/features"), { recursive: true });
  writeFileSync(join(root, "blueprint/features/wallets.ts"), `import { Blueprint } from "orthograph";\nimport plugin from "${plugin}";\n\nexport default Blueprint.use(plugin, (p) => []);\n`);
  const generated = spawnSync(process.execPath, [join(repo, "packages/cli/src/main.ts"), "generate", "--root", root], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (generated.status !== 0) throw new Error(`ortho generate failed:\n${generated.stdout}${generated.stderr}`);
  return root;
};

/** An OTLP/HTTP receiver that writes one export a line to `<dir>/traces.jsonl` and `<dir>/logs.jsonl`, as the Collector's file exporter does. */
const receiver = (dir: string) =>
  Effect.acquireRelease(
    Effect.callback<{ readonly url: string; readonly close: () => void }>((resume) => {
      const server = createServer((request, response) => {
        const chunks: Array<Buffer> = [];
        request.on("data", (chunk: Buffer) => chunks.push(chunk));
        request.on("end", () => {
          const file = request.url === "/v1/traces" ? "traces.jsonl" : request.url === "/v1/logs" ? "logs.jsonl" : undefined;
          if (file !== undefined) appendFileSync(join(dir, file), `${JSON.stringify(JSON.parse(Buffer.concat(chunks).toString("utf8")))}\n`);
          response.writeHead(200, { "content-type": "application/json" });
          response.end("{}");
        });
      });
      server.listen(0, "127.0.0.1", () => resume(Effect.succeed({ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => { server.closeAllConnections(); server.close(); } })));
    }),
    (listening) => Effect.sync(listening.close),
  );

const parent = mkdtempSync(join(tmpdir(), "ortho-wallet-prove-"));
try {
  const root = walletProject(parent);
  const result = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const model = yield* Compiler.model.pipe(Effect.provide(nodeSource(root)));
    const project = yield* Journeys.load(root, model);
    const telemetry = join(parent, "telemetry");
    mkdirSync(telemetry);
    const collector = yield* receiver(telemetry);
    const stood = yield* standChain(model);
    const { url, chain } = yield* Worlds.start({ root, port: 0, name: "wallet-prove", otlp: collector.url, chain: Effect.succeed(stood.chain!) });
    const device = yield* deviceHost(root, collector.url, chain);
    const wallets = { ...project, journeys: project.journeys.filter((j) => j.name.startsWith("wallet ")) };
    const done = yield* exercise(model, wallets, url, FileSource.open(telemetry), "world", collector.url, undefined, false, handlerHashes(root, model), device);
    const wallet = (line: string) => line.includes("wallet.") || line.startsWith("journey wallet ") || line.startsWith("  ");
    return { notes: stood.notes, journeys: done.journeys.lines, evals: done.evals.lines.filter(wallet), closing: closing(done) };
  })));
  // What a person reads: prove's own lines for these journeys, then the evals that did not pass.
  console.log([...result.notes, ...result.journeys, ...result.evals.filter((e) => e.includes("✘") || / \d+ evals ✔/.test(e)), result.closing.line].join("\n"));
  console.log(`RESULT ${JSON.stringify(result)}`);
} finally {
  rmSync(parent, { recursive: true, force: true });
}
