import { Blueprint } from "orthograph";
import { BridgeIndividual } from "../thing.ts";
import { self } from "../roles.ts";

// A read. It answers from the KYC's record, to the person checked and nobody else.
export default Blueprint.read(BridgeIndividual, {
  by: "id",
  fields: ["person", "fullName", "email", "kycLink", "tosLink", "state"],
  allowed: [self],
  budget: { p95: "50 millis" },
});
