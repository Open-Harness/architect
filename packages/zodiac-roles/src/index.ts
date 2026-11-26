// Scaffolded from abi/. Yours from now on.
// `@orthograph/zodiac-roles`: the Zodiac Roles 2.1.1 adapter (#1163, CX-safe section 4, unit A4), laid out as
// `ortho new adapter --from-abi` (A1, #1164) makes one: `abi/` and `src/generated/` (the modifier's and the factory's calls,
// reads, events and errors) are the generator's, and what lies beyond the ABI is hand-written beside them in `src/modules/`:
// the deployment, the Org Budget's compiled calls, the allowance read, the typed refusals and the world starter.
import { Blueprint } from "orthograph";
import { calls, standIn } from "./generated/index.ts";

export default Blueprint.adapter({
  description: "zodiac-roles: Zodiac Roles 2.1.1 for a Safe, its Org Budgets (a role scoped to one function within an allowance) and typed refusals; its world starter puts Zodiac's canonical contracts on a world's Anvil.",
  calls,
  standIn,
});

export * from "./generated/index.ts";
export { ZodiacRoles } from "./modules/roles/service.ts";
export {
  MODULE_PROXY_FACTORY, ROLES_MASTERCOPY,
  type Allowance, type BudgetParam, type ContractCall, type OrgBudget, type RolesApi, type RolesDeployment, type RolesRefusal, type RolesStatus,
} from "./modules/roles/types.ts";
export { ZodiacWorld } from "./modules/world/service.ts";
export type { ZodiacInstalled, ZodiacWorldApi } from "./modules/world/types.ts";
