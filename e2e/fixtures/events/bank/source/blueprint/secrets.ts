import { Blueprint } from "orthograph";

/** The door's signing secret (frame/secrets.md: a plugin declares it by export; the test value is what a world uses). */
export const signing = Blueprint.secret.stored({ describe: "The fixture bank's webhook signing secret.", test: "whsec_bank_fixture_test" });
