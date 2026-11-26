// What the `--from-abi` checks in src/modules/abi/ share (#1164): the fixtures, the generator run, and a generated adapter written to a folder of its
// own, where it can be imported and typechecked as a user's plugin is. Expected values come from the fixtures and README.md,
// never from what the generator answered.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { AbiAdapter } from "../src/modules/abi/service.ts";
import type { ContractInput, GeneratedAbiAdapter } from "../src/modules/abi/types.ts";

/** The abi module's own folder, where its fixtures are. */
export const here = join(import.meta.dirname, "../src/modules/abi");
export const pkg = join(import.meta.dirname, "..");
export const repo = join(pkg, "../..");

const json = (file: string): unknown => JSON.parse(readFileSync(join(here, "fixtures", file), "utf8"));

/** forge's artifact of fixtures/Probe.sol: `{ abi, bytecode: { object } }`. */
export const probeArtifact = json("Probe.json") as { readonly abi: ReadonlyArray<Record<string, unknown>>; readonly bytecode: { readonly object: string } };
/** A bare ABI array with no bytecode: indexed dynamic event inputs, a lone unnamed tuple output, and the items read past. */
export const quietAbi = json("Quiet.json") as ReadonlyArray<Record<string, unknown>>;

export const probe: ContractInput = { contract: "Probe", json: probeArtifact };
export const quiet: ContractInput = { contract: "Quiet", json: quietAbi };

/** The function names of an ABI in its order, each overload `<name>_<n>` from 1 (README.md, "The names"). */
export const callNames = (abi: ReadonlyArray<Record<string, unknown>>, type = "function"): ReadonlyArray<string> => {
  const names = abi.filter((i) => i["type"] === type).map((i) => String(i["name"]));
  const seen = new Map<string, number>();
  return names.map((n) => {
    if (names.filter((m) => m === n).length === 1) return n;
    const k = (seen.get(n) ?? 0) + 1;
    seen.set(n, k);
    return `${n}_${k}`;
  });
};

export const made = (contracts: ReadonlyArray<ContractInput>, name = "probe"): Promise<GeneratedAbiAdapter> =>
  Effect.runPromise(AbiAdapter.generate({ name, contracts }));

/** The refusal's message. A generator that answers files, or dies, fails the test that called this. */
export const refusal = async (contracts: ReadonlyArray<ContractInput>, name = "probe"): Promise<string> => {
  const error = await Effect.runPromise(Effect.flip(AbiAdapter.generate({ name, contracts })));
  if (error._tag !== "AbiRefused") throw new Error(`refused with ${String(error._tag)}, not AbiRefused`);
  return error.message;
};

export const fileOf = (adapter: GeneratedAbiAdapter, path: string): string => {
  const file = adapter.files.find((f) => f.path === path);
  if (file === undefined) throw new Error(`no ${path} among ${adapter.files.map((f) => f.path).join(", ")}`);
  return file.content;
};

export interface Written {
  readonly dir: string;
  readonly adapter: GeneratedAbiAdapter;
  readonly remove: () => void;
  /** The plugin's module at a path from its folder (`src/generated/index.ts`). */
  readonly load: <T = Record<string, unknown>>(path: string) => Promise<T>;
}

/**
 * The adapter's files written to a folder of its own, outside the repository, as `ortho new adapter` writes a plugin, with a
 * `node_modules` that is this package's, so `effect`, `orthograph` and `@orthograph/chain-evm` resolve as an app's would.
 */
export const written = async (contracts: ReadonlyArray<ContractInput>, name = "probe"): Promise<Written> => {
  const adapter = await made(contracts, name);
  const dir = mkdtempSync(join(tmpdir(), "ortho-from-abi-"));
  for (const f of adapter.files) {
    mkdirSync(dirname(join(dir, f.path)), { recursive: true });
    writeFileSync(join(dir, f.path), f.content);
  }
  symlinkSync(join(pkg, "node_modules"), join(dir, "node_modules"), "dir");
  return {
    dir, adapter,
    remove: () => rmSync(dir, { recursive: true, force: true }),
    load: <T>(path: string) => import(/* @vite-ignore */ join(dir, path)) as Promise<T>,
  };
};
