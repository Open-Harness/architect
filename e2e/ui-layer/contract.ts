// The contract the M1.23 builder must meet: the surface of `orthograph/actions` as these checks use it, written once as types.
// Field names are agent-native's (spikes/agent-native-compat/README.md, K29 section 3.1). The checks load the module with a
// dynamic import and treat it as this shape, so a missing export fails the check that needs it, not the whole file's typecheck.
import type { Effect, Schema } from "effect";

/** What the hosting app passes to `run`: agent-native's `ActionRunContext`, structurally (spike finding 1), plus the approval it already holds. */
export interface ActionContext {
  readonly caller: string;
  readonly toolCallId?: string;
  readonly userEmail?: string;
  readonly signal?: AbortSignal;
  readonly requestHeaders?: Headers;
  /** Set by a host that already asked its person and got a yes (agent-native's `approvedToolCallKey`, spike finding 6). */
  readonly approvedToolCallKey?: string;
}

/** What generated code is given (K29 3.1): the SDK's call, made as the right caller, and the call's request key. */
export interface ActionHost<Client> {
  /** Runs the SDK call. A declared refusal rejects as an `ActionRefusal`, anything else as a plain redacted `Error` (use `runForAction`). */
  readonly call: <A>(use: (client: Client) => Effect.Effect<A, unknown>, ctx?: ActionContext) => Promise<A>;
  readonly requestKey: (ctx?: ActionContext) => string | undefined;
}

/** What `options(host)` returns, in agent-native's field names (K29 3.1). `errors` maps a refusal's tag to its code, a declaration only. */
export interface ActionOptions<Args, Answer> {
  readonly name: string;
  readonly description: string;
  readonly schema: Schema.Codec<Args, unknown>;
  readonly readOnly: boolean;
  readonly needsApproval: boolean;
  readonly agentTool: boolean;
  readonly errors: Readonly<Record<string, string>>;
  readonly run: (args: Args, ctx?: ActionContext) => Promise<Answer>;
}

/** What is asked of a person when an action `needsApproval` and no approval was given. */
export interface ApprovalRequest {
  readonly action: string;
  readonly description: string;
  readonly args: unknown;
}

/** The person: resolves true for a yes, false for a no. Never asked by `run`, only by the `defineAction` wrapper. */
export interface Approver {
  readonly ask: (request: ApprovalRequest) => Promise<boolean>;
}

/** What `defineAction` returns: the options, with `run` wrapped (approval first, then the call, refusals typed, defects redacted). */
export interface Action<Args = unknown, Answer = unknown> extends ActionOptions<Args, Answer> {}

/** One row of the registry's `list`. `inputSchema` is a JSON Schema object (draft 2020-12 or 7), plain JSON. */
export interface ListedAction {
  readonly name: string;
  readonly description: string;
  readonly readOnly: boolean;
  readonly needsApproval: boolean;
  readonly agentTool: boolean;
  readonly inputSchema: {
    readonly type?: string;
    readonly properties?: Readonly<Record<string, Record<string, unknown>>>;
    readonly required?: ReadonlyArray<string>;
  };
}

export interface ActionRegistry {
  readonly list: () => ReadonlyArray<ListedAction>;
  readonly get: (name: string) => Action | undefined;
}

/** The refusal agent-native reads by duck typing (spike finding 3): an `Error` with these members and nothing of agent-native's. */
export interface ActionRefusalShape extends Error {
  readonly actionContractError: true;
  readonly noWrite: true;
  readonly errorCode: string;
  readonly statusCode: 422;
  readonly details: Readonly<Record<string, unknown>> | undefined;
}

export interface ActionsModule {
  readonly defineAction: <Args, Answer>(options: ActionOptions<Args, Answer>, approver: Approver) => Action<Args, Answer>;
  readonly ActionRefusal: new (message: string, errorCode: string, details?: Record<string, unknown>) => ActionRefusalShape;
  /**
   * Runs an SDK call's Effect for a host. A failure that is a declared refusal (`NotAllowed` is `AR-001`, `IdempotencyConflict`
   * is `AR-002`, any other has a string `code`) rejects as an `ActionRefusal` with `details` the failure's other fields;
   * every other failure, defect or interruption rejects as a plain `Error` with a fixed, readable message that carries nothing
   * of the original. An aborted `signal` interrupts the call.
   */
  readonly runForAction: <A, E>(effect: Effect.Effect<A, E>, ctx?: { readonly signal?: AbortSignal }) => Promise<A>;
  readonly Actions: { readonly registry: (actions: ReadonlyArray<Action<any, any>>) => ActionRegistry };
}

/** The specifier the checks import. The builder adds `"./actions"` to `packages/orthograph/package.json` `exports`. */
export const ACTIONS_MODULE = "orthograph/actions";

/** Loads `orthograph/actions`. Called inside each test, so every check fails by name while the module is missing. */
export const loadActions = async (): Promise<ActionsModule> => (await import(/* @vite-ignore */ ACTIONS_MODULE)) as ActionsModule;
