import { Blueprint } from "orthograph";
import { Count } from "../../values/counts.ts";

// Depends on the data: more than is left this month.
export class PurseExceeded extends Blueprint.error({ left: Count }, { exit: 83 }) {}
