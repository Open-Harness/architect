// Generated from GitHub v3 REST API 1.1.4. Do not edit.
import { Blueprint } from "orthograph";
import * as written from "../../../src/written.ts";

const { code } = written as { readonly code?: string };

export const Github = Blueprint.thing({
  description: "What GitHub v3 REST API fails with.",
  fields: { id: Blueprint.id("github") },
  ...(code === undefined ? {} : { code }),
});
