// The sandbox adapter's descriptor (K40 fix 4, GOAL17-check-harness call 4, GOAL17-slice9-sandbox): the calls an app's handlers make and the
// refusals they are told of, by name. Its runtime is the bridge in `main.ts`; the wire shapes are `modules/bridge/README.md`.
import { Blueprint, Stand } from "orthograph";

/** A `write`, `read` or `exec`'s `cwd` resolved outside the sandbox's folder. */
export class OutsideSandbox extends Blueprint.error({ path: Blueprint.text(), root: Blueprint.text(), resolved: Blueprint.text() }, { exit: 91 }) {}
/** An `exec` whose command, or a command it ran, is on the blocked list. */
export class BlockedCommand extends Blueprint.error({ command: Blueprint.text() }, { exit: 92 }) {}
/** The sandbox was closed, swept, or never opened. */
export class SandboxGone extends Blueprint.error({ sandbox: Blueprint.text() }, { exit: 93 }) {}
/** The bridge holds its limit of open sandboxes. */
export class SandboxLimit extends Blueprint.error({ open: Blueprint.uint(32) }, { exit: 94 }) {}
/** An execution variable's name looks like a credential: a credential is only ever lent, for one call. */
export class CredentialLikeVariable extends Blueprint.error({ variable: Blueprint.text() }, { exit: 95 }) {}
/** A lent credential had already expired when the call came. */
export class LoanExpired extends Blueprint.error({ variable: Blueprint.text() }, { exit: 96 }) {}

export default Blueprint.adapter({
  description: "A folder and a shell for an agent to work in, served over a socket (pi-env), with a bridge on this Mac as its stand-in.",
  calls: {
    /** One sandbox per (owner, tag): a retry finds the same one. Answers its id, its socket's address and its folder. */
    open: Blueprint.call({ mode: "effect", errors: [SandboxLimit, CredentialLikeVariable] }),
    /** Closes it: its commands killed, its daemon stopped, its folders removed. A second close is `closed: false`. */
    close: Blueprint.call({ mode: "effect", errors: [] }),
    /** One command, with credentials lent for this call alone (`lend`, K40 fix 6). */
    exec: Blueprint.call({ mode: "effect", errors: [BlockedCommand, OutsideSandbox, SandboxGone, LoanExpired] }),
    write: Blueprint.call({ mode: "effect", errors: [OutsideSandbox, SandboxGone] }),
    read: Blueprint.call({ mode: "effect", errors: [OutsideSandbox, SandboxGone] }),
    /** The open sandboxes, by tag: what the retire sweep reads. */
    list: Blueprint.call({ mode: "effect", errors: [] }),
  },
  standIn: Stand.process("packages/sandbox/src/main.ts"),
});
