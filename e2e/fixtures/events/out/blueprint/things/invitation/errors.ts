import { Blueprint } from "orthograph";

/** An address at blocked.example: refused before anything is written, so nothing is announced. */
export class InvitationBlocked extends Blueprint.error({}, { exit: 81 }) {}
