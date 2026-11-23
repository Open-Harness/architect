import { Blueprint } from "orthograph";
import { Allowance } from "./thing.ts";

// The Safe the allowance spends from, acting through its owners. On a grant, decided on the payload's `safe` (M6-chain item 5).
export const treasury = Blueprint.role(Allowance, { who: Allowance.fields.safe });
// The member the allowance was granted to: the wallet that signs the spend.
export const grantee = Blueprint.role(Allowance, { who: Allowance.fields.member });
