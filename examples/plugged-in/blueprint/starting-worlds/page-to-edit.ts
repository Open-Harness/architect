// Journey-author file. See claimed.ts for why each starting world has a name of its own.
import { Blueprint } from "orthograph";
import claim from "../things/handle/verbs/claim.ts";
import add from "../things/link/verbs/add.ts";

/** aaron has claimed `editpage` and put three links on it, in this order: GitHub, Blog, Talks. It gives the last one. */
export default Blueprint.startingWorld("page-to-edit", {
  cast: { aaron: Blueprint.signedIn },
  makes: (s) => [
    s.aaron.run(claim, { name: "editpage" }),
    s.aaron.run(add, { title: "GitHub", url: "https://github.com/aaron" }),
    s.aaron.run(add, { title: "Blog", url: "https://aaron.example.com/blog" }),
    s.aaron.run(add, { title: "Talks", url: "https://aaron.example.com/talks" }),
  ],
  gives: (s) => ({ lastLink: s.last.link }),
});
