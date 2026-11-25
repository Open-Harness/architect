// Generated from Bridge API 1. Do not edit.
import type adapter from "./index.ts";
import { makeClient, type ClientOptions, type Input } from "./runtime/client.ts";
import { components } from "./spec/components.ts";
import { operations } from "./spec/operations.ts";

export { AnswerRefused, ApiFailure, InputRefused, Unreachable, type ClientOptions, type Input } from "./runtime/client.ts";

type Calls<T> = { readonly [K in keyof T]: T[K] extends { readonly kind: "call" } ? (input?: Input) => Promise<unknown> : Calls<T[K]> };

/** `client({ baseUrl, token? }).calls.<group>.<call>(input)` is a promise of the answer's JSON, as it came. */
export const client = (options: ClientOptions): { readonly calls: Calls<typeof adapter.calls> } => makeClient(operations, components, options) as never;
