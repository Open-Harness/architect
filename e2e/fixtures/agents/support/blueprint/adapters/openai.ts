// Journey-author file (M4.02). The model provider every agent here uses: the OpenAI-compatible adapter, which a world
// serves with the local stand-in model (M4-agents call 5). No key is declared or held: the stand-in needs none.
import { Blueprint } from "orthograph";
import { openai } from "@orthograph/openai";

export default Blueprint.use(openai, (o) => [o.include(o.calls.chat.completions.create)]);
