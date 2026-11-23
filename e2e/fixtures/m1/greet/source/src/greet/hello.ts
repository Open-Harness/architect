import { Effect } from "effect";
import type { Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/greet/verbs/hello.js";

const hello: Handler<typeof declaration> = ({ name }) => Effect.succeed({ text: `hello, ${name}` });

export default hello;
