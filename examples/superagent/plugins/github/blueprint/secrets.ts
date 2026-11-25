// Generated from GitHub v3 REST API 1.1.4. Do not edit.
import { Blueprint } from "orthograph";

/** Where the service answers, its base path included. A world's stand-in (`ORTHO_STAND_<MOUNT>`) wins over it. */
export const baseUrl = Blueprint.secret.stored({ describe: "Where the service answers, its base path included" });
