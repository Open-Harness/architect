// Slice 8, the sandbox (`@orthograph/sandbox`, GOAL17-check-harness call 4): a write outside it refused by name, a blocked command failed by name,
// no credential among the execution variables, and nothing left after the superagent retires. Red until slice 9 builds the sandbox and its bridge.
import { journeysPass } from "./agents-support.ts";

journeysPass("the sandbox", ["a-write-outside-the-sandbox-is-refused", "a-blocked-command-fails-by-name", "no-credential-among-the-execution-variables"]);
