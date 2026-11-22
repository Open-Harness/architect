import { Blueprint } from "orthograph";
import { Payment } from "./thing.ts";
import { Count, Title } from "../../values/counts.ts";

export const PaymentStarted = Blueprint.event({ payment: Payment.fields.id, amount: Count });
export const PaymentSettled = Blueprint.event({ payment: Payment.fields.id, intent: Title });
