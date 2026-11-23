// Journey-author file. See claimed.ts for why each starting world has a name of its own.
import { Blueprint } from "orthograph";
import claim from "../things/handle/verbs/claim.ts";
import add from "../things/link/verbs/add.ts";

/** aaron has claimed `guardpage` and put one link on it, GitHub. It gives that link. */
export default Blueprint.startingWorld("page-to-guard", {
  cast: { aaron: Blueprint.signedIn },
  makes: (s) => [
    s.aaron.run(claim, { name: "guardpage" }),
    s.aaron.run(add, { title: "GitHub", url: "https://github.com/aaron" }),
  ],
  gives: (s) => ({ lastLink: s.last.link }),
});
