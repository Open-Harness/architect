import { Blueprint } from "orthograph";
import { owner } from "../organization/roles.ts";

// A refusal that carries one field of each visibility, as the answer does.
export class LockerSealed extends Blueprint.error({
  hint: Blueprint.text({ max: 60 }),
  memo: Blueprint.visibility.private(Blueprint.text({ max: 60 }), owner),
  pin: Blueprint.visibility.secret(Blueprint.text({ max: 60 })),
}, { exit: 61 }) {}
