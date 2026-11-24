import { Blueprint } from "orthograph";
import { BridgeBusiness } from "./thing.ts";
import { RejectionReason } from "../../values/bridge.ts";

export const KybStarted = Blueprint.event({ business: BridgeBusiness.fields.id, company: BridgeBusiness.fields.company });
export const KybApproved = Blueprint.event({ business: BridgeBusiness.fields.id });
export const KybRejected = Blueprint.event({ business: BridgeBusiness.fields.id, reason: RejectionReason });
