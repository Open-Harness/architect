import { Blueprint, Chain } from "orthograph";

export const usdc = Chain.evm.token("usdc");
export const Usdc = Blueprint.money(usdc);
export const Recipient = Blueprint.account();
export const Reason = Blueprint.text({ max: 280 });
export const Purpose = Blueprint.text({ max: 280 });
