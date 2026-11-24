import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { BridgeBusiness } from "../bridge-business/thing.ts";
import { Name } from "../../values/company.ts";
import { AccountCurrency, DepositDetail } from "../../values/bridge.ts";

// ERPNext's Bank Account (erpnext/accounts/doctype/bank_account), a company's own, opened through Capxul's Bridge
// account as a Bridge virtual account on the company's approved KYB. Its bank details are the deposit instructions
// Bridge gives (`source_deposit_instructions`): for USD, `bank_name`, `bank_account_number` and `bank_routing_number`;
// for EUR, the IBAN and BIC in the same two places.
export const BankAccount = Blueprint.thing({
  description: "A bank account a company holds through Bridge, which takes deposits in one currency.",
  code: "BA",
  fields: {
    id: Blueprint.id("bac"),
    company: Company.fields.id,
    business: Blueprint.described(BridgeBusiness.fields.id, "The company's approved KYB the account is opened on."),
    accountName: Blueprint.described(Name, "What the company calls the account (ERPNext's `account_name`)."),
    currency: Blueprint.described(AccountCurrency, "The currency it takes deposits in."),
    bankName: Blueprint.described(DepositDetail, "The bank that holds it, as Bridge names it."),
    accountNumber: Blueprint.described(DepositDetail, "Its account number, or IBAN, as Bridge gives it."),
    routingNumber: Blueprint.described(DepositDetail, "Its routing number, or BIC, as Bridge gives it."),
  },
});
