import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { SafeKind, SaltNonce, Threshold } from "../../values/safe.ts";

// A Safe Capxul knows about (design/decisions/CX-safe.md, section 1): a record in Capxul's own database from the moment
// a person or a company has one, before anything is on chain. Its address is the one Safe 1.4.1's factory will give it,
// worked out from its first owner and its salt nonce, so money can be paid there at once. After deploy (S3) the chain
// is the truth for owners and threshold, and these are a read copy.
export const Safe = Blueprint.thing({
  description: "A Safe: a person's own on-chain account, or a company's, at the address it has before it is deployed.",
  code: "SF",
  fields: {
    id: Blueprint.id("saf"),
    kind: Blueprint.described(SafeKind, "Whose it is: a person's own, or a company's."),
    person: Blueprint.described(Blueprint.optional(Blueprint.id("per")), "Whose Safe it is, when it is a person's."),
    company: Blueprint.described(Blueprint.optional(Company.fields.id), "The company it is for, when it is a company's."),
    account: Blueprint.described(Blueprint.account(), "Its address, worked out before it is deployed, as a CAIP-10 account with the address checksummed (EIP-55)."),
    firstOwner: Blueprint.described(Blueprint.account(), "The one owner it is set up with, checksummed: the bootstrap key for a person's, the founder's own Safe for a company's."),
    owners: Blueprint.described(Blueprint.list(Blueprint.account()), "Who owns it today: its first owner until the chain says otherwise."),
    threshold: Blueprint.described(Threshold, "How many owners must approve a transaction: 1 at setup."),
    saltNonce: Blueprint.described(SaltNonce, "The salt nonce its address is worked out from, kept so the address can be checked again."),
  },
});
