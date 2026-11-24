// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { ExpenseClaimTypeCreated } from "../blueprint/things/expense-claim-type/events.ts";
import { ExpenseTypeTaken } from "../blueprint/things/expense-claim-type/errors.ts";
import { machine } from "../blueprint/things/expense-claim-type/machine.ts";
import create from "../blueprint/things/expense-claim-type/verbs/create.ts";
import get from "../blueprint/things/expense-claim-type/verbs/get.ts";

export default Blueprint.journey("set up expense types", {
  // Ada runs Acme Trading; Bo is signed in and runs nothing of hers.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a company",
  steps: (s) => [
    s.step(
      "Ada adds Travel",
      s.ada.run(create, { company: s.world.company, expenseType: "Travel" }),
      expect((a) => a.expenseClaimType).toMatch(/^ect_[0-9a-z]+$/),
      emits(ExpenseClaimTypeCreated, { expenseClaimType: s.last.expenseClaimType, company: s.world.company }),
      machine.isIn(s.last.expenseClaimType, "active"),
      spans({ present: ["expense-claim-type.create", "expense-claim-type.create.insert"] }),
    ),
    s.step(
      "it reads back as she typed it",
      s.ada.run(get, { id: s.last.expenseClaimType }),
      expect((a) => [a.company, a.expenseType, a.state]).toEqual([s.world.company, "Travel", "active"]),
      noEvents(),
    ),
    s.step(
      "a second type can't take its name",
      s.ada.run(create, { company: s.world.company, expenseType: "Travel" }),
      refuses(ExpenseTypeTaken, { expenseType: "Travel" }),
      noEvents(),
    ),
    s.step(
      "Ada adds Calls, which is its own type",
      s.ada.run(create, { company: s.world.company, expenseType: "Calls" }),
      expect((a) => a.expenseClaimType).toMatch(/^ect_[0-9a-z]+$/),
      emits(ExpenseClaimTypeCreated, { expenseClaimType: s.last.expenseClaimType, company: s.world.company }),
    ),
    s.step(
      "Bo can't read Ada's type",
      s.bo.run(get, { id: s.last.expenseClaimType }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Calls reads back as Calls",
      s.ada.run(get, { id: s.last.expenseClaimType }),
      expect((a) => [a.company, a.expenseType, a.state]).toEqual([s.world.company, "Calls", "active"]),
      noEvents(),
    ),
    s.step(
      "Bo can't add a type to Ada's company",
      s.bo.run(create, { company: s.world.company, expenseType: "Bo's lunches" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["expense-claim-type.create", "expense-claim-type.create.insert"] }),
    ),
  ],
});
