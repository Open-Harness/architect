import { Blueprint } from "orthograph";
import { Manager } from "../manager/thing.ts";

// Three presets, from the Roles and permissions screen: Owner, Builder, Member.
// GAP roles-who-holds: only `rule` exists, and a rule sees the record and the principal, not a membership row.
// Capxul's company-wide role (gap-company-roles, landed by #768 and #939) is the nearest form; the spelling below is a guess at it.
export const owner = Blueprint.role(Manager, { rule: Blueprint.todo("GAP roles-who-holds: holds the owner role in manager.workspace") });
export const builder = Blueprint.role(Manager, { rule: Blueprint.todo("GAP roles-who-holds: holds owner or builder in manager.workspace") });
export const member = Blueprint.role(Manager, { rule: Blueprint.todo("GAP roles-who-holds: is a member of manager.workspace") });

// AARON: per-person overrides ("this Member may also delete tasks") are on the screen today. They are a Grant held by
// a person, or they are dropped in favour of three fixed presets. Board decision 6.
