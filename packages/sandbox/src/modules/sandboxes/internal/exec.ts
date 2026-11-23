import { Effect } from "effect";
import type { Timers } from "@orthograph/language-effect";
import { BlockedCommand } from "../../commands/types.ts";
import { Commands } from "../../commands/service.ts";
import { Loans } from "../../loans/service.ts";
import type { ExecError, ExecInput, Executed } from "../types.ts";
import { pgidsFile, type Shared } from "./live.ts";
import { runTracked } from "./spawn.ts";
import { inside, liveOf } from "./lookup.ts";
import { readHits } from "./hits.ts";

/**
 * One command in the sandbox: the first word against the blocked list, `cwd` against the fence, the loans checked and put in this
 * process's environment alone, then run. What a shim refused on the way is logged; output and the recorded command have lent
 * values redacted. A command refused by name exits 126 in the record and fails as `BlockedCommand`.
 */
export const execIn = (shared: Shared, input: ExecInput): Effect.Effect<Executed, ExecError, Timers> =>
  Effect.gen(function* () {
    const live = yield* liveOf(shared, input.sandbox);
    const cwd = yield* inside(live, input.cwd ?? ".");
    const taken = yield* Loans.take(input.lend ?? [], shared.config.now());
    const command = input.command.map(taken.redact);
    const lent = taken.loans.map((l) => l.name);
    const record = { command, exit: null as number | null, lent };
    live.execs.push(record);
    live.loans.push(...taken.loans);

    const first = Commands.firstBlocked(input.command, live.blocked);
    if (first !== undefined) {
      record.exit = 126;
      live.refusals.push({ name: "BlockedCommand", detail: Commands.refusalText(first) });
      return yield* Effect.fail(new BlockedCommand({ command: first }));
    }

    // `.pgids` lists `<pgid> <program>` for each running command, so the next bridge can kill what a SIGKILL left, and only what is still ours.
    const pgids = () => (live.state === "open" ? shared.disk.writeSync(pgidsFile(live.shims), [...live.programs].map(([pid, program]) => `${pid} ${program}`).join("\n")) : Effect.void);
    const ran = yield* runTracked({
      sandbox: live.id, open: () => live.state === "open", record: pgids, argv: input.command, cwd, env: { ...live.processEnv, ...taken.env },
      running: live.running, programs: live.programs, timeout: `${input.timeoutSeconds ?? 120} seconds`,
    });
    const refused = yield* readHits(shared, live);
    record.exit = ran.exit;
    // A shim exits 126 after saying its name: that is the command being refused, not a program failing.
    if (ran.exit === 126 && refused.length > 0) return yield* Effect.fail(new BlockedCommand({ command: refused.at(-1)! }));
    return { exit: ran.exit, stdout: taken.redact(ran.stdout), stderr: taken.redact(ran.stderr) };
  });
