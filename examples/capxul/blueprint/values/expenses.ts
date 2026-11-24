import { Blueprint } from "orthograph";
import usdc from "../assets/usdc.ts";

/** An amount in USDC, in base units (ERPNext's Currency, CX-grill, section 3). */
export const Amount = Blueprint.value(Blueprint.money(usdc));
/** What a claim type is called (ERPNext's `expense_type`): Travel, Calls, Food. */
export const ExpenseTypeName = Blueprint.value(Blueprint.text({ max: 140 }));
