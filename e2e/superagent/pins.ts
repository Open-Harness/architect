// The three published specs, pinned (specs/README.md says how and why). A check on the whole spec fetches it once into
// `tmp/specs/`, from the pinned URL, and refuses a file whose hash is not the pin's.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repo } from "../layer1/support.ts";

export type Name = "github" | "slack" | "posthog";
export const NAMES: ReadonlyArray<Name> = ["github", "slack", "posthog"];

export interface Pin {
  readonly title: string;
  readonly version: string;
  readonly url: string;
  /** A pinned URL names a commit, so its bytes never change: a different hash fails. PostHog's cannot be pinned, so a different hash is a warning. */
  readonly pinnedByUrl: boolean;
  readonly sha256: string;
  readonly bytes: number;
  readonly fetched: string;
  /** What the oracle counts in the whole file, when it was pinned. */
  readonly counts: { readonly operations: number; readonly events: number };
  readonly trimmed: { readonly file: string; readonly sha256: string };
}

export const specs = join(repo, "e2e/superagent/specs");
export const PINS = JSON.parse(readFileSync(join(specs, "pins.json"), "utf8")) as Record<Name, Pin>;
export const trimmed = (name: Name) => join(specs, PINS[name].trimmed.file);
export const sha256 = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** The whole spec, fetched once into tmp/specs/ (a unique temp file, renamed into place, so two runs never collide). A pinned URL that serves other bytes throws. */
export const fullSpec = async (name: Name): Promise<{ readonly file: string; readonly drifted: boolean }> => {
  const pin = PINS[name];
  const dir = join(repo, "tmp/specs");
  const file = join(dir, `${name}-${pin.sha256.slice(0, 12)}.json`);
  if (existsSync(file) && sha256(file) === pin.sha256) return { file, drifted: false };
  mkdirSync(dir, { recursive: true });
  let bytes: Buffer;
  try {
    const response = await fetch(pin.url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`status ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    throw new Error(`the whole-spec checks need the network once: ${pin.url} could not be fetched (${String(error)}). Fetch it, or restore tmp/specs/ from a cache keyed on e2e/superagent/specs/pins.json.`);
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  const temp = join(dir, `.${name}-${process.pid}-${Date.now().toString(36)}.part`);
  writeFileSync(temp, bytes);
  if (hash === pin.sha256) { renameSync(temp, file); return { file, drifted: false }; }
  if (pin.pinnedByUrl) { rmSync(temp, { force: true }); throw new Error(`${pin.url} served ${hash}, not the pinned ${pin.sha256}`); }
  const live = join(dir, `${name}-${hash.slice(0, 12)}-live.json`);
  renameSync(temp, live);
  return { file: live, drifted: true };
};
