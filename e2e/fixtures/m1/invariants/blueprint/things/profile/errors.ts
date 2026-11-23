import { Blueprint } from "orthograph";

export class ProfileNotFound extends Blueprint.error({}, { exit: 14 }) {}
