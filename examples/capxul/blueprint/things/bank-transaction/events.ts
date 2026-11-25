import { Blueprint } from "orthograph";
import { BankTransaction } from "./thing.ts";
import { TransferFailure } from "../../values/bridge.ts";

export const DepositLanded = Blueprint.event({
  transaction: BankTransaction.fields.id,
  account: BankTransaction.fields.account,
  deposit: BankTransaction.fields.deposit,
  reference: BankTransaction.fields.reference,
});
export const TransferSent = Blueprint.event({
  transaction: BankTransaction.fields.id,
  account: BankTransaction.fields.account,
  withdrawal: BankTransaction.fields.withdrawal,
});
export const TransferSettled = Blueprint.event({ transaction: BankTransaction.fields.id });
export const TransferFailed = Blueprint.event({ transaction: BankTransaction.fields.id, state: TransferFailure });
