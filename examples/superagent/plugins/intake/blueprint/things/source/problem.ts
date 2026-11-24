import { Blueprint } from "orthograph";
import { Source } from "./thing.ts";

/** A source that fails three polls in a row is a problem a superagent shows (GOAL17-derived-reads). */
export default Blueprint.problem(Source, { kind: "source", of: Source.fields.superagent, name: Source.fields.name, failures: Source.fields.failures, after: Source.fields.failAfter });
