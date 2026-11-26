// Scaffolded from blueprint/things/salary-structure/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import { SalaryComponent } from "../../blueprint/things/salary-component/thing.ts";
import { SalaryDetail } from "../../blueprint/things/salary-detail/thing.ts";
import { SalaryStructure } from "../../blueprint/things/salary-structure/thing.ts";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/salary-structure/create.handler.ts";

const { StructureWithoutEarnings, StructureComponentNotInCompany, StructureComponentWrongType, StructureLineWithoutAmount, StructureComponentRepeated } = Errors.declared;

/**
 * salary-structure.create: Draft a salary structure with its earnings and deductions.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/salary-structure/verbs/create.ts:
 *   company              salary-structure.company
 *   salaryStructureName  salary-structure.salaryStructureName
 *   earnings             schema
 *   deductions           schema
 *
 * Answer, from blueprint/things/salary-structure/verbs/create.ts:
 *   salaryStructure  salary-structure.id
 *   totalEarning     salary-structure.totalEarning
 *   totalDeduction   salary-structure.totalDeduction
 *   netPay           salary-structure.netPay
 *
 * Refusals:
 *   StructureWithoutEarnings        exit 41   SS-001  yours to refuse below; from blueprint/things/salary-structure/errors.ts
 *   StructureComponentNotInCompany  exit 42   SS-002  yours to refuse below, carrying salaryComponent; from blueprint/things/salary-structure/errors.ts
 *   StructureComponentWrongType     exit 43   SS-003  yours to refuse below, carrying salaryComponent; from blueprint/things/salary-structure/errors.ts
 *   StructureLineWithoutAmount      exit 44   SS-004  yours to refuse below, carrying salaryComponent; from blueprint/things/salary-structure/errors.ts
 *   StructureComponentRepeated      exit 45   SS-005  yours to refuse below, carrying salaryComponent; from blueprint/things/salary-structure/errors.ts
 *   SalaryStructureNameTaken        exit 48   SS-008  the runtime's: another salary structure holds this company and salary structure name (salary-structure.oneNamePerCompany); from blueprint/things/salary-structure/invariants.ts
 *   NotAllowed                      exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict             exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/salary-structure/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/salary-structure/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/salary-structure/verbs/create.ts: p95 200ms.
 *
 * The salary-structure's machine, from blueprint/things/salary-structure/machine.ts (▶ marks this call):
 *     from       move    to         emits
 *   ▶ (creates)  create  draft      SalaryStructureDrafted
 *     draft      submit  submitted  SalaryStructureSubmitted
 *     submitted  cancel  cancelled  SalaryStructureCancelled
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the salary-structure's new id and hands it in as id;
 *   each step is its own span: salary-structure.create.load, salary-structure.create.insert;
 *   once it answers, it sets the salary-structure's state to draft;
 *   once it answers, it writes SalaryStructureDrafted: salaryStructure and netPay from the answer, company from the payload;
 *   the call is the span salary-structure.create, and its commit salary-structure.create.commit.
 */
const create: Handler = ({ company, salaryStructureName, earnings, deductions }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // Every line, earnings then deductions, with the table it is in.
    const lines = [
      ...earnings.map((line) => ({ ...line, type: "Earning" as const })),
      ...deductions.map((line) => ({ ...line, type: "Deduction" as const })),
    ];

    // Step load: database, span salary-structure.create.load. Each line's component; one that isn't there is no
    // component of this company's.
    const components = yield* steps.load(Effect.forEach(lines, (line) => records.find(SalaryComponent, line.salaryComponent)));

    // Refusal order (errors.ts). Each line refusal names the component of the first line that breaks it.
    // StructureWithoutEarnings: exit 41, SS-001.
    if (earnings.length === 0) {
      yield* Effect.logInfo("the structure has no earning");
      return yield* new StructureWithoutEarnings({});
    }

    // The company and type checks, line by line.
    for (const [i, line] of lines.entries()) {
      const component = components[i];
      // StructureComponentNotInCompany: exit 42, SS-002.
      if (!component || component["company"] !== company) {
        yield* Effect.logInfo(`${line.salaryComponent} is no component of this company's`);
        return yield* new StructureComponentNotInCompany({ salaryComponent: line.salaryComponent });
      }
      // StructureComponentWrongType: exit 43, SS-003.
      if (component["type"] !== line.type) {
        yield* Effect.logInfo(`${line.salaryComponent} is a ${component["type"]}, among the ${line.type.toLowerCase()}s`);
        return yield* new StructureComponentWrongType({ salaryComponent: line.salaryComponent });
      }
    }

    // A line given 0 pays its component's amount (HRMS's `set_missing_values`).
    const paid = lines.map((line, i) => ({ ...line, amount: line.amount === 0n ? (components[i]!["amount"] as bigint) : line.amount }));

    // StructureLineWithoutAmount: exit 44, SS-004. Over every line, before any repeat.
    const unpaid = paid.find((line) => line.amount === 0n);
    if (unpaid) {
      yield* Effect.logInfo(`the line for ${unpaid.salaryComponent} pays nothing, and its component has no amount`);
      return yield* new StructureLineWithoutAmount({ salaryComponent: unpaid.salaryComponent });
    }

    // StructureComponentRepeated: exit 45, SS-005. The first line that repeats an earlier one names it.
    const repeat = lines.find((line, i) => lines.findIndex((l) => l.salaryComponent === line.salaryComponent) < i);
    if (repeat) {
      yield* Effect.logInfo(`${repeat.salaryComponent} is on two lines`);
      return yield* new StructureComponentRepeated({ salaryComponent: repeat.salaryComponent });
    }

    // Step insert: database, in the store salary-structure, salary-detail, span salary-structure.create.insert. The
    // structure with its totals, then its lines, each table numbered from 1 in the order given.
    const sum = (type: "Earning" | "Deduction") => paid.filter((l) => l.type === type).reduce((total, l) => total + l.amount, 0n);
    const totalEarning = sum("Earning");
    const totalDeduction = sum("Deduction");
    const netPay = totalEarning - totalDeduction;
    yield* steps.insert(
      Effect.gen(function* () {
        yield* records.insert(SalaryStructure, { id, company, salaryStructureName, totalEarning, totalDeduction, netPay });
        for (const type of ["Earning", "Deduction"] as const) {
          for (const [i, l] of paid.filter((p) => p.type === type).entries()) {
            const lineId = yield* Ids.of(SalaryDetail.fields.id);
            yield* records.insert(SalaryDetail, {
              id: lineId,
              salaryStructure: id,
              type,
              line: BigInt(i + 1),
              salaryComponent: l.salaryComponent,
              amount: l.amount,
            });
          }
        }
      }),
    );

    // The move create, to draft.
    yield* move();

    return {
      // SalaryStructureDrafted needs salaryStructure, and only the answer can give it.
      salaryStructure: id,
      totalEarning,
      totalDeduction,
      netPay,
    };
  });

export default create;
