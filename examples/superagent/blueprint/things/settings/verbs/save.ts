import { Blueprint } from "orthograph";
import { StaleRevision } from "@orthograph/superagent/blueprint/things/superagent/errors.ts";
import { Settings } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Settings, {
  description: "Save a new version of the settings. A save made from an older version is refused, with the current one. A main agent may only propose it.",
  payload: { base: Blueprint.uint(32), variables: Settings.fields.variables, blocked: Settings.fields.blocked },
  answer: { settings: Settings.fields.id, revision: Settings.fields.revision },
  move: machine.moves.save,
  errors: [StaleRevision],
  allowed: [Blueprint.signedIn],
});
