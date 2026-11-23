import { Blueprint } from "orthograph";
import { BridgeIndividual } from "./thing.ts";
import { RejectionReason } from "../../values/bridge.ts";

export const KycStarted = Blueprint.event({ individual: BridgeIndividual.fields.id, person: BridgeIndividual.fields.person });
export const KycApproved = Blueprint.event({ individual: BridgeIndividual.fields.id });
export const KycRejected = Blueprint.event({ individual: BridgeIndividual.fields.id, reason: RejectionReason });
