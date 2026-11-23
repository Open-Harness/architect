import { Blueprint } from "orthograph";

export class HandleTaken extends Blueprint.error({}, { exit: 10 }) {}
export class HandleAlreadyOwned extends Blueprint.error({}, { exit: 12 }) {}
export class HandleNotFound extends Blueprint.error({}, { exit: 13 }) {}
