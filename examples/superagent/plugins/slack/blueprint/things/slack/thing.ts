// Generated from Slack Web API 1.7.0. Do not edit.
import { Blueprint } from "orthograph";
import * as written from "../../../src/written.ts";

const { code } = written as { readonly code?: string };

export const Slack = Blueprint.thing({
  description: "What Slack Web API fails with.",
  fields: { id: Blueprint.id("slack") },
  ...(code === undefined ? {} : { code }),
});
