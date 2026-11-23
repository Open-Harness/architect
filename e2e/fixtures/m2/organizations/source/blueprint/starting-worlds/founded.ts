// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint, type Allowed, type StartingWorld } from "orthograph";
import { owner } from "../things/organization/roles.js";
import create from "../things/organization/verbs/create.js";

/** Ada has founded an organisation. She owns it. */
const world: StartingWorld<{ readonly ada: Allowed }> = Blueprint.startingWorld("founded", {
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { name: "Acme Demo" })],
  gives: (s) => ({ organization: s.last.organization }),
});

export default world;
