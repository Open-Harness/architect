// Generated from Bridge API 1. Do not edit.
import { Blueprint } from "orthograph";

/** Where the service answers, its base path included. A world's stand-in (`ORTHO_STAND_<MOUNT>`) wins over it. */
export const baseUrl = Blueprint.secret.stored({ describe: "Where the service answers, its base path included" });
/** The key each call sends, where the description's security says. */
export const apiKey = Blueprint.secret.stored({ describe: "The key the service is called with" });
