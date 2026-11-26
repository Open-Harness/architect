// Scaffolded from blueprint/things/appraisal-template/verbs/create.ts. Yours from now on.
import { BigDecimal, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Errors } from "../../generated/api/src/index.ts";
import type { Handler } from "../../generated/api/src/appraisal-template/create.handler.ts";
import { AppraisalTemplate } from "../../blueprint/things/appraisal-template/thing.ts";
import { Kra } from "../../blueprint/things/kra/thing.ts";
import { EmployeeFeedbackCriteria } from "../../blueprint/things/employee-feedback-criteria/thing.ts";
import { HUNDRED, ZERO } from "../appraisal-math.ts";

const { TemplateWithoutKras, TemplateKraNotInCompany, TemplateCriteriaNotInCompany, TemplateLineRepeated, TemplateWeightageOutOfRange, KraWeightageNotHundred, CriteriaWeightageNotHundred } = Errors.declared;

/**
 * appraisal-template.create: Make an appraisal template: KRAs and rating criteria, each with its weightage.
 *
 * Who may call, from blueprint/things/company/roles.ts:
 *   the owner of its company: (company, caller) => company.owner === caller.person
 *
 * Payload, from blueprint/things/appraisal-template/verbs/create.ts:
 *   company   appraisal-template.company
 *   title     appraisal-template.title
 *   kras      appraisal-template.kras
 *   criteria  appraisal-template.criteria
 *
 * Answer, from blueprint/things/appraisal-template/verbs/create.ts:
 *   appraisalTemplate  appraisal-template.id
 *
 * Refusals:
 *   TemplateWithoutKras           exit 41   TP-001  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   TemplateKraNotInCompany       exit 42   TP-002  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   TemplateCriteriaNotInCompany  exit 43   TP-003  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   TemplateLineRepeated          exit 44   TP-004  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   TemplateWeightageOutOfRange   exit 45   TP-005  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   KraWeightageNotHundred        exit 46   TP-006  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   CriteriaWeightageNotHundred   exit 47   TP-007  yours to refuse below; from blueprint/things/appraisal-template/errors.ts
 *   TemplateTitleTaken            exit 48   TP-008  the runtime's: another appraisal template holds this company and title (appraisal-template.oneTitlePerCompany); from blueprint/things/appraisal-template/invariants.ts
 *   NotAllowed                    exit 3    AR-001  the runtime's, when the caller isn't the owner of its company; from blueprint/things/company/roles.ts
 *   IdempotencyConflict           exit 120  AR-002  the runtime's, when the same request key comes with another payload; from blueprint/things/appraisal-template/verbs/create.ts
 *
 * Idempotent by request, from blueprint/things/appraisal-template/verbs/create.ts: the same request key from the same caller is one call.
 * Budget, from blueprint/things/appraisal-template/verbs/create.ts: p95 200ms.
 *
 * The appraisal-template's machine, from blueprint/things/appraisal-template/machine.ts (▶ marks this call):
 *     from       move    to      emits
 *   ▶ (creates)  create  active  AppraisalTemplateCreated
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the owner of its company;
 *   before it runs, it reads the company and hands it in as refs.company;
 *   before it runs, it mints the appraisal-template's new id and hands it in as id;
 *   each step is its own span: appraisal-template.create.load, appraisal-template.create.insert;
 *   once it answers, it sets the appraisal-template's state to active;
 *   once it answers, it writes AppraisalTemplateCreated: appraisalTemplate from the answer, company from the payload;
 *   the call is the span appraisal-template.create, and its commit appraisal-template.create.commit.
 */
const create: Handler = ({ company, title, kras, criteria }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;

    // Step load: database, span appraisal-template.create.load. Each line's KRA or criteria, to see whose it is.
    const { kraRows, criteriaRows } = yield* steps.load(
      Effect.all({
        kraRows: Effect.forEach(kras, (line) => records.find(Kra, line.kra)),
        criteriaRows: Effect.forEach(criteria, (line) => records.find(EmployeeFeedbackCriteria, line.criteria)),
      }),
    );

    // Refusal order (errors.ts): no KRAs, a line from elsewhere, a repeat, a weightage out of range, then the totals.
    // TemplateWithoutKras: exit 41, TP-001.
    if (kras.length === 0) {
      yield* Effect.logInfo("the template has no KRA lines");
      return yield* new TemplateWithoutKras({});
    }

    // TemplateKraNotInCompany: exit 42, TP-002. A KRA that doesn't exist is refused the same way.
    if (kraRows.some((row) => row?.["company"] !== company)) {
      yield* Effect.logInfo("a KRA line names a KRA the company doesn't have");
      return yield* new TemplateKraNotInCompany({});
    }

    // TemplateCriteriaNotInCompany: exit 43, TP-003.
    if (criteriaRows.some((row) => row?.["company"] !== company)) {
      yield* Effect.logInfo("a criteria line names criteria the company doesn't have");
      return yield* new TemplateCriteriaNotInCompany({});
    }

    // TemplateLineRepeated: exit 44, TP-004. A KRA, or a criteria, appears once.
    if (new Set(kras.map((l) => l.kra)).size !== kras.length || new Set(criteria.map((l) => l.criteria)).size !== criteria.length) {
      yield* Effect.logInfo("a KRA or criteria appears on two lines");
      return yield* new TemplateLineRepeated({});
    }

    // TemplateWeightageOutOfRange: exit 45, TP-005. Each line is above 0 and at most 100.
    const weightages = [...kras.map((l) => l.weightage), ...criteria.map((l) => l.weightage)];
    if (weightages.some((w) => !BigDecimal.isGreaterThan(w, ZERO) || BigDecimal.isGreaterThan(w, HUNDRED))) {
      yield* Effect.logInfo("a line's weightage isn't above 0 and at most 100");
      return yield* new TemplateWeightageOutOfRange({});
    }

    // KraWeightageNotHundred: exit 46, TP-006. HRMS's validate_total_weightage.
    if (!BigDecimal.equals(BigDecimal.sumAll(kras.map((l) => l.weightage)), HUNDRED)) {
      yield* Effect.logInfo("the KRA weightages don't total 100");
      return yield* new KraWeightageNotHundred({});
    }

    // CriteriaWeightageNotHundred: exit 47, TP-007. Only when the template has criteria.
    if (criteria.length > 0 && !BigDecimal.equals(BigDecimal.sumAll(criteria.map((l) => l.weightage)), HUNDRED)) {
      yield* Effect.logInfo("the criteria weightages don't total 100");
      return yield* new CriteriaWeightageNotHundred({});
    }

    // Step insert: database, span appraisal-template.create.insert. A title the company already has is the runtime's
    // refusal (oneTitlePerCompany).
    yield* steps.insert(records.insert(AppraisalTemplate, { id, company, title, kras, criteria }));

    // The move create, to active.
    yield* move();

    return {
      // AppraisalTemplateCreated needs appraisalTemplate, and only the answer can give it.
      appraisalTemplate: id,
    };
  });

export default create;
