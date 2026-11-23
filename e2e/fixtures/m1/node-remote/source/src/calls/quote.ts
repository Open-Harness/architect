// A Node-capable Promise callable: its public parameter type (node:sqlite's DatabaseSync) must never enter a client.
import { DatabaseSync } from "node:sqlite";

export const open = () => new DatabaseSync(":memory:");

export default (db: DatabaseSync): Promise<{ readonly value: string }> =>
  Promise.resolve({ value: String(db.prepare("SELECT 'node-capable' AS value").get()?.["value"]) });
