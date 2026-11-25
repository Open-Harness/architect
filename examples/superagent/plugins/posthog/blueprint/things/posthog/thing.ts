// Generated from PostHog API 1.0.0. Do not edit.
import { Blueprint } from "orthograph";
import * as written from "../../../src/written.ts";

const { code } = written as { readonly code?: string };

export const Posthog = Blueprint.thing({
  description: "What PostHog API fails with.",
  fields: { id: Blueprint.id("posthog") },
  ...(code === undefined ? {} : { code }),
});
