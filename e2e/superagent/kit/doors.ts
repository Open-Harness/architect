// The doors a slice 8 journey reaches through (GOAL17-check-harness, calls 1 to 5). A journey imports descriptors only: a route
// name and two types, never a handler (`testing.ts`) or a stand-in's `main.ts`.
//
// Where the record names a package, the journey imports that package's descriptor, so the check is red until the package exists:
//   models        @orthograph/stand-in-model/stand   (call 1)
//   calls, told   @orthograph/agents/probes          (calls 1 and 5)
//   outbox        orthograph                         (call 3, `packages/orthograph/src/modules/plugins/probes.ts`)
// The record names no export for the GitHub, Slack and sandbox stand-ins' commands (only their files), so those three are written
// here, each exactly as the record's code gives it. Slices 9 and 11 replace them with their packages' own when they build them.
import { outbox } from "orthograph";
import { models } from "@orthograph/stand-in-model/stand";
import { calls, told } from "@orthograph/agents/probes";

export { outbox, models, calls, told };

type Json = unknown;
const command = (mount: string, name: string) => (args: Json): { readonly kind: "stand-call"; readonly mount: string; readonly command: string; readonly args: Json } =>
  ({ kind: "stand-call", mount, command: name, args });
const common = (mount: string) => ({
  seen: command(mount, "seen"), hold: command(mount, "hold"), held: command(mount, "held"),
  release: command(mount, "release"), fail: command(mount, "fail"), reset: command(mount, "reset"),
});

/** GOAL17-check-harness call 2: `examples/superagent/plugins/github/src/stand-in/commands.ts`. */
export const github = {
  ...common("github"),
  comment: command("github", "comment"), deliver: command("github", "deliver"), refs: command("github", "refs"),
  pulls: command("github", "pulls"), replies: command("github", "replies"),
};
/** GOAL17-check-harness call 2: `examples/superagent/plugins/slack/src/stand-in/commands.ts`. */
export const slack = { ...common("slack"), say: command("slack", "say"), deliver: command("slack", "deliver"), replies: command("slack", "replies") };
/** GOAL17-check-harness call 4: `packages/sandbox/src/stand-in/commands.ts`. */
export const sandbox = { ...common("sandbox"), seen: command("sandbox", "seen"), left: command("sandbox", "left") };

/** What the record's `OutboxRow` carries, as a journey's picks read it. */
export interface Row { readonly event: string; readonly name: string; readonly to: string; readonly subject: string; readonly seq: number; readonly state: string; readonly attempts: number; readonly due: string; readonly hold: string | null; readonly outcome: string | null }
export interface Told { readonly requestId: string; readonly text: string; readonly assignment: string | null; readonly how: "submitted" | "steered" }
export interface ModelStep { readonly requestId: string; readonly round: number; readonly tools: ReadonlyArray<string>; readonly text: string }
