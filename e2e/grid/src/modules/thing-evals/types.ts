// The thing row's nine evals (K14, "Thing"). One thing, named in the list (`link`), judged in every output: the model's fields, the API's
// schemas, the server's decoding, the SDK's type, the CLI's flags, the MCP tool's input schema, the docs' reference page, the portal's card
// and page, and the span's `payload.*` and `answer.*`. What each judges is read from the model's fields, never typed.
import type { Eval } from "../grid/types.ts";
import type { ProjectEvidence } from "../project-evidence/types.ts";

export interface ThingEvalsApi { readonly evals: ReadonlyArray<Eval<ProjectEvidence>> }
