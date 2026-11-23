// Check 16's drivers: one call through each way a caller can be answered, as each caller, with the bytes it got.
// Every one is a real process or request against the world: HTTP by `fetch`, the generated SDK and CLI as programs of
// the project's own, and MCP through OAuth as a signed-in person.
import { callAs } from "../layer2/mcp.ts";
import { runCli, runSdk } from "./clients.ts";
import type { Live, Name, Person, Sentinels, Who } from "./visibility.ts";
import { KIND, mayShow } from "./visibility.ts";

/** Where the answer or refusal reaches a caller: HTTP, the SDK's decoded answer or typed failure, the CLI's text and its `--json`, MCP. */
export type Output = "http" | "sdk" | "cli" | "cli-json" | "mcp";
/** What was asked: `locker.open` with the key (an answer), with the crowbar (a refusal), and `locker.get` (a read). */
export type Call = "answer" | "refusal" | "read";
export interface Capture { readonly output: Output; readonly who: Who; readonly call: Call; readonly bytes: string }

export const OUTPUTS: ReadonlyArray<Output> = ["http", "sdk", "cli", "cli-json", "mcp"];
export const CALLS: ReadonlyArray<Call> = ["answer", "refusal", "read"];

/**
 * The values each call's bytes must carry for `who` (so an output that says nothing cannot pass for one that hides well). Not
 * judged: MCP's private case (the agent audience has no roles in K12's list), and the CLI's refusal line, a one-line summary
 * whose private fields `Errors.shown` hides today and the principal rule may show.
 */
/** The answer of `locker.open` is the call that issued `code`: the direct doors carry it to its own caller, whoever that is. */
export const issues = (output: Output, call: Call) => call === "answer" && output !== "mcp";

export const shownIn = (output: Output, call: Call, who: Who): ReadonlyArray<Name> => {
  const names: ReadonlyArray<Name> = call === "refusal" ? ["hint", "memo"] : issues(output, call) ? ["label", "note", "code"] : ["label", "note"];
  const judged = (name: Name) => KIND[name] === "public" || name === "code" || (output !== "mcp" && !(call === "refusal" && output.startsWith("cli")));
  return names.filter((name) => mayShow(who, issues(output, call)).includes(name) && judged(name));
};

interface Caller { readonly who: Who; readonly person?: Person }

const http = async (live: Live, path: string, body: object, token?: string) => {
  const response = await fetch(`${live.url}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
};

/** An organisation of ada's, and a locker in it: the planted note and code are in the world's store, where only handlers read them. */
export const stock = async (live: Live, ada: Person, label: string) => {
  const organization = JSON.parse((await http(live, "/organization/create", { name: "Acme Demo", cap: "1000" }, ada.token)).text) as { organization: string };
  const installed = await http(live, "/locker/install", { organization: organization.organization, label }, ada.token);
  return { installed, organization: organization.organization };
};

const viaHttp = async (live: Live, who: Caller, locker: string): Promise<ReadonlyArray<Capture>> => {
  const asks = { answer: ["/locker/open", { locker, tool: "key" }], refusal: ["/locker/open", { locker, tool: "crowbar" }], read: ["/locker/get", { id: locker }] } as const;
  return Promise.all(CALLS.map(async (call): Promise<Capture> => {
    const sent = await http(live, asks[call][0], asks[call][1], who.person?.token);
    return { output: "http", who: who.who, call, bytes: `${sent.status}\n${sent.text}` };
  }));
};

const sdkBody = `const layer = Sdk.layer(env.URL, env.TOKEN || undefined);
const call = (program: Effect.Effect<any, any, any>) => settle(program.pipe(Effect.provide(layer)));
out({ call: "answer", ...(await call(Sdk.locker.open({ locker: env.LOCKER as never, tool: "key" }))) });
out({ call: "refusal", ...(await call(Sdk.locker.open({ locker: env.LOCKER as never, tool: "crowbar" }))) });
out({ call: "read", ...(await call(Sdk.locker.get({ id: env.LOCKER as never }))) });`;

const viaSdk = async (root: string, live: Live, who: Caller, locker: string): Promise<ReadonlyArray<Capture>> => {
  const ran = await runSdk(root, `visibility-${who.who}`, sdkBody, { URL: live.url, TOKEN: who.person?.token ?? "", LOCKER: locker });
  const raw = ran.stdout.split("\n").filter((line) => line.startsWith("{"));
  return CALLS.map((call): Capture => ({ output: "sdk", who: who.who, call, bytes: raw.find((line) => line.includes(`"call":"${call}"`)) ?? `no line for ${call}\n${ran.stderr}` }));
};

const viaCli = async (root: string, live: Live, who: Caller, locker: string): Promise<ReadonlyArray<Capture>> => {
  const env = { ACME_URL: live.url, ACME_TOKEN: who.person?.token ?? "" };
  const args = { answer: ["locker", "open", "--locker", locker, "--tool", "key"], refusal: ["locker", "open", "--locker", locker, "--tool", "crowbar"], read: ["locker", "get", "--id", locker] } as const;
  const captures: Array<Capture> = [];
  for (const output of ["cli", "cli-json"] as const) {
    for (const call of CALLS) {
      const ran = await runCli(root, env, ...args[call], ...(output === "cli-json" ? ["--json"] : []));
      captures.push({ output, who: who.who, call, bytes: `${ran.status}\n${ran.stdout}\n${ran.stderr}` });
    }
  }
  return captures;
};

const viaMcp = async (live: Live, who: Caller, locker: string): Promise<ReadonlyArray<Capture>> => {
  if (!who.person) return [];
  const asks = { answer: ["locker.open", { locker, tool: "key" }], refusal: ["locker.open", { locker, tool: "crowbar" }], read: ["locker.get", { id: locker }] } as const;
  const captures: Array<Capture> = [];
  for (const call of CALLS) {
    const called = await callAs(live.url, who.person, asks[call][0], asks[call][1]);
    captures.push({ output: "mcp", who: who.who, call, bytes: `${called.isError}\n${called.text}` });
  }
  return captures;
};

/** Every call through every output as every caller, the planted values in the world. Anonymous has no MCP: the door is OAuth. */
export const captureAll = async (root: string, live: Live, planted: Sentinels) => {
  const cast = await live.cast("ada", "bob");
  const { installed, organization } = await stock(live, cast["ada"]!, planted.label);
  const locker = (JSON.parse(installed.text) as { locker?: string }).locker ?? "";
  const callers: ReadonlyArray<Caller> = [{ who: "keeper", person: cast["ada"]! }, { who: "stranger", person: cast["bob"]! }, { who: "anonymous" }];
  const captures: Array<Capture> = [];
  for (const caller of callers) {
    captures.push(...(await viaHttp(live, caller, locker)), ...(await viaSdk(root, live, caller, locker)), ...(await viaCli(root, live, caller, locker)), ...(await viaMcp(live, caller, locker)));
  }
  return { captures, locker, organization, installed, planted };
};
export type Captured = Awaited<ReturnType<typeof captureAll>>;
