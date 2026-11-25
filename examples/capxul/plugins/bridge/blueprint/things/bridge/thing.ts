// Generated from Bridge API 1. Do not edit.
import { Blueprint } from "orthograph";
import * as written from "../../../src/written.ts";

const { code } = written as { readonly code?: string };

export const Bridge = Blueprint.thing({
  description: "What Bridge API fails with.",
  fields: { id: Blueprint.id("bridge") },
  ...(code === undefined ? {} : { code }),
});
