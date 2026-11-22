// Generated from blueprint/things/handle/verbs/claim.ts (model handle.claim). Do not edit.
import { createParts, wrappedButton, wrappedChild } from "@ui-sdk/web";
import { handleClaim } from "./handle-claim.ts";

/** Custom elements for a plain page, such as one of Frappe's: <linkup-handle-claim><form>...</form></linkup-handle-claim>. */
createParts(handleClaim, {
  root: { tag: "linkup-handle-claim", target: wrappedChild("form"), display: "contents", api: ["setName", "submit"] },
  name: { tag: "linkup-handle-claim-name", target: wrappedChild("input"), display: "contents" },
  refusal: "linkup-handle-claim-refusal",
  submit: { tag: "linkup-handle-claim-submit", target: wrappedButton, display: "contents" },
});
