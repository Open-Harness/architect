// Generated from PostHog API 1.0.0. Do not edit.
import { Blueprint } from "orthograph";

/** The service answered with an HTTP status of 400 or more, or a 200 whose body says `ok: false` (its `code`). */
export class PosthogApiFailure extends Blueprint.error({ status: Blueprint.uint(16), code: Blueprint.optional(Blueprint.text({ max: 200 })) }, { exit: 81 }) {}
/** The input doesn't fit the call, so nothing was sent. */
export class PosthogInputRefused extends Blueprint.error({}, { exit: 82 }) {}
/** The answer doesn't fit what the description documents. */
export class PosthogAnswerRefused extends Blueprint.error({}, { exit: 83 }) {}
/** The service couldn't be reached. */
export class PosthogUnreachable extends Blueprint.error({}, { exit: 84 }) {}
