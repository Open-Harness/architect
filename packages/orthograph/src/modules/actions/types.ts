// The surface of `orthograph/actions`, in agent-native's field names (spikes/agent-native-compat/README.md, K29 section 3.1).
import type { Effect, Schema } from "effect";

/** What the hosting app passes to `run`: agent-native's `ActionRunContext`, structurally, plus the approval it already holds. */
export interface ActionContext {
  readonly caller: string;
  readonly toolCallId?: string;
  readonly userEmail?: string;
  readonly signal?: AbortSignal;
  readonly requestHeaders?: Headers;
  /** Set by a host that already asked its person and got a yes. */
  readonly approvedToolCallKey?: string;
}

/** What generated code is given: the SDK's call, made as the right caller, and the call's request key. */
export interface ActionHost<Client> {
  readonly call: <A>(use: (client: Client) => Effect.Effect<A, unknown>, ctx?: ActionContext) => Promise<A>;
  readonly requestKey: (ctx?: ActionContext) => string | undefined;
}

/** What `options(host)` returns. `errors` maps a refusal's tag to its code, a declaration only. */
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

/** The person: resolves true for a yes, false for a no. Asked only by the `defineAction` wrapper, never by `run`. */
export interface Approver {
  readonly ask: (request: ApprovalRequest) => Promise<boolean>;
}

/** What `defineAction` returns: the options, with `run` wrapped. */
export interface Action<Args = unknown, Answer = unknown> extends ActionOptions<Args, Answer> {}

/** One row of the registry's `list`: plain JSON. */
export interface ListedAction {
  readonly name: string;
  readonly description: string;
  readonly readOnly: boolean;
  readonly needsApproval: boolean;
  readonly agentTool: boolean;
  readonly inputSchema: Readonly<Record<string, unknown>>;
}

export interface ActionRegistry {
  readonly list: () => ReadonlyArray<ListedAction>;
  readonly get: (name: string) => Action<any, any> | undefined;
}

/** The refusal agent-native reads by duck typing: an `Error` with these members and nothing of agent-native's. */
export interface ActionRefusalShape extends Error {
  readonly actionContractError: true;
  readonly noWrite: true;
  readonly errorCode: string;
  readonly statusCode: 422;
  readonly details: Readonly<Record<string, unknown>> | undefined;
}

/** Refusal codes the module itself raises. */
export const RefusalCodes = { notAllowed: "AR-001", idempotencyConflict: "AR-002", approvalDeclined: "AR-007" } as const;

export interface ActionsApi {
  readonly defineAction: <Args, Answer>(options: ActionOptions<Args, Answer>, approver: Approver) => Action<Args, Answer>;
  readonly runForAction: <A, E>(effect: Effect.Effect<A, E>, ctx?: { readonly signal?: AbortSignal }) => Promise<A>;
  readonly registry: (actions: ReadonlyArray<Action<any, any>>) => ActionRegistry;
}
