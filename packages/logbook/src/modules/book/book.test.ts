import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { expect, it } from "vitest";
import { initialize, insertVerdict, schema, selectAll, selectLatest } from "./internal/sql.ts";

it("upgrades older books and round-trips each journey verdict beside its aggregate", () => {
  using database = new DatabaseSync(":memory:");
  const sql = {
    exec: (query: string, ...values: Array<SQLInputValue>) => {
      const rows = database.prepare(query).all(...values);
      return { toArray: () => rows, one: () => rows[0] };
    },
  } as unknown as SqlStorage;
  for (const statement of schema) database.exec(statement);
  database.exec(`INSERT INTO verdicts (revision, environment, operation, verdict, repository, ref, workflow)
    VALUES ('first', 'test', 'allowance.spend', 'pass', 'fixture', 'refs/heads/main', 'test')`);
  initialize(sql);
  initialize(sql);
  const journeys = [
    { journey: "journeys/spend.ts", modelHash: "a".repeat(64), handlerHash: "b".repeat(64), verdict: "pass" },
    { journey: "journeys/revoke.ts", modelHash: "a".repeat(64), handlerHash: "b".repeat(64), verdict: "fail" },
  ] as const;
  const current = insertVerdict(sql, { revision: "second", environment: "test", operation: "allowance.spend", verdict: "fail", journeys },
    { repository: "fixture", ref: "refs/heads/main", workflow: "test", eventName: null, sha: null });
  expect(current.journeys).toEqual(journeys);
  expect(selectAll(sql, {})).toMatchObject([{ revision: "first" }, { revision: "second", journeys }]);
  expect(selectAll(sql, { revision: "first" })[0]).not.toHaveProperty("journeys");
  expect(selectLatest(sql, {})).toEqual([current]);
});
