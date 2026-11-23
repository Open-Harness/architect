import { Blueprint } from "orthograph";

/** Whoever receives a payment: a CAIP-10 account, an address in Solidity. */
export const Recipient = Blueprint.value(Blueprint.account());
