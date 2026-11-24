import { Blueprint } from "orthograph";
import { Subscription } from "./thing.ts";

export const SubscriptionStarted = Blueprint.event({ subscription: Subscription.fields.id, ticket: Subscription.fields.ticket });
export const SubscriptionEnded = Blueprint.event({ subscription: Subscription.fields.id });
