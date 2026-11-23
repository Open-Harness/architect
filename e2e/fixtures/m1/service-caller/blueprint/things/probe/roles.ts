import { Blueprint } from "orthograph";
import { Probe } from "./thing.ts";
import pricing from "../../adapters/pricing.ts";
import ledger from "../../adapters/ledger.ts";

// Roles for outside services (M2-auth, fork 3): a `service` role admits `service(<its mount>)` and nobody else. The mount's name is its file's.
export const pricer = Blueprint.role(Probe, { service: pricing });
export const ledgerer = Blueprint.role(Probe, { service: ledger });
