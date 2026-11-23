import { Blueprint } from "orthograph";

// Kept over the generated ProfileNotFound, as acme keeps AllowanceNotFound.
export class ProfileNotFound extends Blueprint.error({}, { exit: 20 }) {}
