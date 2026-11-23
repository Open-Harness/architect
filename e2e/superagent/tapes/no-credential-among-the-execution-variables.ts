import { WORLD } from "../tape/tapekit.ts";

const v = (name: string, from: string, value = "x") => ({ name, from, value });
const ROOT = "/tmp/sbx_1/root";
// in the order the record gives: the built-ins, then the source's, then settings'
const ENV = [v("SUPERAGENT_DIR", "built-in", ROOT), v("SUPERAGENT_NAME", "built-in", "coder"), v("SUPERAGENT_TICKET", "built-in", "tkt_one"), v("SUPERAGENT_BLOCKED_COMMANDS", "built-in", ""),
  v("GITHUB_REPOSITORY", "source", "acme/widgets"), v("GITHUB_NUMBER", "source", "12"), v("REGION", "settings", "eu-west")];
const seen = (env = ENV, state = "open", root = ROOT) => ({ sandboxes: [{ sandbox: "sbx_1", state, root, env, execs: [], refusals: [] }] });
const swap = (name: string, to: ReturnType<typeof v>) => ENV.map((e) => (e.name === name ? to : e));
export default {
  world: WORLD,
  steps: {
    "#1": { answer: { settings: "set_1", revision: 1n } },
    "#5": { answer: seen() }, "#6": { answer: seen() }, "#7": { answer: seen() }, "#8": { answer: seen() },
    "#11": { answer: seen(ENV, "closed") }, "#12": { answer: { folders: [], processes: [] } },
  },
  plants: [
    { name: "a token is among the variables", step: "#5", with: () => ({ answer: seen([...ENV, v("GITHUB_TOKEN", "source")]) }) },
    { name: "the settings' variable is missing", step: "#5", with: () => ({ answer: seen(ENV.filter((e) => e.name !== "REGION")) }) },
    { name: "a built-in variable is missing", step: "#5", with: () => ({ answer: seen(ENV.filter((e) => e.name !== "SUPERAGENT_DIR")) }) },
    { name: "a variable comes from the wrong place", step: "#5", with: () => ({ answer: seen(swap("REGION", v("REGION", "built-in", "eu-west"))) }) },
    { name: "the same variable twice", step: "#5", with: () => ({ answer: seen([...ENV, v("REGION", "settings", "eu-west")]) }) },
    { name: "the settings variable's value is its description, not its value", step: "#6", with: () => ({ answer: seen(swap("REGION", v("REGION", "settings", "The region the tests run in."))) }) },
    { name: "the issue's number is wrong", step: "#6", with: () => ({ answer: seen(swap("GITHUB_NUMBER", v("GITHUB_NUMBER", "source", "13"))) }) },
    { name: "the superagent's name is wrong", step: "#6", with: () => ({ answer: seen(swap("SUPERAGENT_NAME", v("SUPERAGENT_NAME", "built-in", "other"))) }) },
    { name: "SUPERAGENT_DIR is not the sandbox's root", step: "#6", with: () => ({ answer: seen(swap("SUPERAGENT_DIR", v("SUPERAGENT_DIR", "built-in", "/home/me"))) }) },
    { name: "the blocked list is not what settings say", step: "#6", with: () => ({ answer: seen(swap("SUPERAGENT_BLOCKED_COMMANDS", v("SUPERAGENT_BLOCKED_COMMANDS", "built-in", "sudo"))) }) },
    { name: "the canary is in a value", step: "#7", with: () => ({ answer: seen(swap("REGION", v("REGION", "settings", "ortho-canary-github-key"))) }) },
    { name: "the sandbox was already closed before the retire, so the retire did nothing", step: "#8", with: () => ({ answer: seen(ENV, "closed") }) },
    { name: "the sandbox is still open after the retire", step: "#11", with: () => ({ answer: seen(ENV, "open") }) },
    { name: "a folder is left", step: "#12", with: () => ({ answer: { folders: ["/tmp/sbx_1"], processes: [] } }) },
    { name: "a process is left", step: "#12", with: () => ({ answer: { folders: [], processes: [{ pid: 9, sandbox: "sbx_1", command: "sleep" }] } }) },
  ],
};
