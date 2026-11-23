// The descriptor: pure metadata. A feature with a store of its own (K3 item 7): mounted, its things live in
// `<mount>-ledger`, a database beside the project's default, and the project never sees them.
import { Blueprint } from "orthograph";

export default Blueprint.feature({
  description: "Keeps lines in a ledger of its own.",
  choices: {},
  needs: [],
});
