// What agent-native 0.228.2 reads from an action, RECORDED here so the type test (check 11) needs no agent-native package.
// The record comes from `spikes/agent-native-compat/` (README findings 1, 3, 4, 6, 7) and `spikes/generated-app/design/agent-native-0.228.2.md`,
// which read `@agent-native/core@0.228.2`'s `dist/` (`action.js`, `server/action-routes.js`, `agent/production-agent.js`). Where the spike did not
// record a member's type, it is `unknown` below and the check says nothing of it; the five members a generated `run` may read
// (`caller`, `toolCallId`, `userEmail`, `signal`, `requestHeaders`) are the ones the spike compiled a generated action against.
// Written by the checks author; a builder never edits this file. To move to a newer agent-native, re-record it from that version's `dist/`.

/** `defineAction`'s field names (`action.ts` `DefineActionWithSchema`, line ~1010; spike README finding 1 and `agent-native-0.228.2.md`). */
export type DefineActionFieldName =
  | "description" | "schema" | "outputSchema" | "outputErrorStrategy" | "errors" | "run" | "http" | "readOnly" | "retrySafe" | "needsApproval"
  | "allowPersistentApproval" | "authorize" | "agentTool" | "mcpTool" | "uiOnly" | "toolCallable" | "changeResource" | "audit" | "mcpAnnotations"
  | "link" | "mcpApp" | "timeoutMs" | "parallelSafe" | "title" | "parameters";

/** The caller doors the spike listed for `ActionRunContext.caller` (`action.ts:190`). */
export type ActionCaller = "tool" | "http" | "frontend" | "mcp" | "cli" | "mcp-widget" | "webmcp" | "a2a";

/** `ActionRunContext` (`action.ts:190`): every member the spike names. The five a generated action may read are typed; the rest are `unknown`. */
export interface ActionRunContext {
  readonly caller: ActionCaller;
  readonly toolCallId?: string;
  readonly userEmail?: string;
  readonly signal?: AbortSignal;
  readonly requestHeaders?: Headers;
  readonly orgId?: unknown;
  readonly appId?: unknown;
  readonly appRoles?: unknown;
  readonly appPermissions?: unknown;
  readonly automation?: unknown;
  readonly networkProtocol?: unknown;
  readonly threadId?: unknown;
  readonly runId?: unknown;
  readonly turnId?: unknown;
  readonly mcpClient?: unknown;
  readonly send?: unknown;
  /** Set once a person approved the call (`production-agent.js:7843`). */
  readonly approvedToolCallKey?: string;
}

/** A Standard Schema V1, as agent-native's `schema` takes it (`~standard.validate`); its JSON Schema half is `~standard.jsonSchema`. */
export interface StandardSchemaLike<Input = unknown, Output = Input> {
  readonly "~standard": { readonly version: 1; readonly vendor: string; readonly validate: (value: unknown) => unknown; readonly types?: { readonly input: Input; readonly output: Output } | undefined };
}

/** What an action offers `defineAction`, for the fields a generated action has: its `schema`, flags and `run(args, ctx?)`. */
export interface DefineActionInput<Args, Answer> {
  readonly description: string;
  readonly schema: StandardSchemaLike<unknown, Args>;
  readonly readOnly?: boolean;
  readonly needsApproval?: boolean;
  readonly agentTool?: boolean;
  readonly mcpTool?: boolean;
  readonly run: (args: Args, ctx?: ActionRunContext) => Answer | Promise<Answer>;
}

/**
 * The error agent-native reads as "the call was refused and wrote nothing": by its members, not by class (`action.js:82-89` `isActionContractError`,
 * `:128-131` `isNoWriteError`; the HTTP route reads `statusCode`, `errorCode` and `details` by property, `server/action-routes.js:1267-1366`).
 */
export interface NoWriteError extends Error {
  readonly actionContractError: true;
  readonly noWrite: true;
  readonly errorCode: string;
  readonly statusCode: number;
  readonly details: Readonly<Record<string, unknown>> | undefined;
}

/** `isActionContractError`, as `action.js:82-89` has it, minus the `instanceof` half (our refusal is not agent-native's class). */
export const isActionContractError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { actionContractError?: unknown }).actionContractError === true && typeof (error as { errorCode?: unknown }).errorCode === "string";

/** `isNoWriteError`, as `action.js:128-131` has it: the above, and `noWrite === true`. */
export const isNoWriteError = (error: unknown): boolean => isActionContractError(error) && (error as { noWrite?: unknown }).noWrite === true;

/** The members the recorded no-write error has, as the check lists them. */
export const NO_WRITE_FIELDS = ["actionContractError", "noWrite", "errorCode", "statusCode", "details"] as const;
