import { Blueprint } from "orthograph";

export const Wallet = Blueprint.thing({
  description: "A key, kept where its signer keeps it (browser, node, keystore or world), named by its CAIP-10 account.",
  fields: { id: Blueprint.id("wal") },
  code: "WL",
});
