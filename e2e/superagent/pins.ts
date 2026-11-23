// The three published specs, pinned (specs/README.md says how and why). A check on the whole spec fetches it once into
// `tmp/specs/`, from the pinned URL, and refuses a file whose hash is not the pin's.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

/** The whole spec, fetched once. The hash is judged here: a pinned URL that serves other bytes throws. */
export const fullSpec = async (name: Name): Promise<{ readonly file: string; readonly drifted: boolean }> => {
  const pin = PINS[name];
  const dir = join(repo, "tmp/specs");
  const file = join(dir, `${name}-${pin.sha256.slice(0, 12)}.json`);
  if (existsSync(file) && sha256(file) === pin.sha256) return { file, drifted: false };
  const live = join(dir, `${name}-live.json`);
  mkdirSync(dir, { recursive: true });
  const response = await fetch(pin.url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`fetching ${pin.url}: ${response.status}. The whole-spec checks need this file once, then use tmp/specs/.`);
  writeFileSync(live, Buffer.from(await response.arrayBuffer()));
  if (sha256(live) === pin.sha256) { writeFileSync(file, readFileSync(live)); return { file, drifted: false }; }
  if (pin.pinnedByUrl) throw new Error(`${pin.url} served ${sha256(live)}, not the pinned ${pin.sha256}`);
  return { file: live, drifted: true };
};
