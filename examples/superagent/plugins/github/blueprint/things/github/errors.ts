// Generated from GitHub v3 REST API 1.1.4. Do not edit.
import { Blueprint } from "orthograph";
import * as written from "../../../src/written.ts";

const { exit = 81 } = written as { readonly exit?: number | undefined };

/** The service answered with an HTTP status of 400 or more, or a 200 whose body says `ok: false` (its `code`). */
export class GithubApiFailure extends Blueprint.error({ status: Blueprint.uint(16), code: Blueprint.optional(Blueprint.text({ max: 200 })) }, { exit }) {}
/** The input doesn't fit the call, so nothing was sent. */
export class GithubInputRefused extends Blueprint.error({}, { exit: exit + 1 }) {}
/** The answer doesn't fit what the description documents. */
export class GithubAnswerRefused extends Blueprint.error({}, { exit: exit + 2 }) {}
/** The service couldn't be reached. */
export class GithubUnreachable extends Blueprint.error({}, { exit: exit + 3 }) {}
