// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// Weightages are exact decimals with two places. Refusal order on create (appraisal-template/errors.ts):
// TemplateWithoutKras, TemplateKraNotInCompany, TemplateCriteriaNotInCompany, TemplateLineRepeated,
// TemplateWeightageOutOfRange, KraWeightageNotHundred, CriteriaWeightageNotHundred; TemplateTitleTaken at commit.
import { BigDecimal } from "effect";
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { AppraisalTemplateCreated } from "../blueprint/things/appraisal-template/events.ts";
import {
  CriteriaWeightageNotHundred,
  KraWeightageNotHundred,
  TemplateCriteriaNotInCompany,
  TemplateKraNotInCompany,
  TemplateLineRepeated,
  TemplateTitleTaken,
  TemplateWeightageOutOfRange,
  TemplateWithoutKras,
} from "../blueprint/things/appraisal-template/errors.ts";
import { machine as templates } from "../blueprint/things/appraisal-template/machine.ts";
import create from "../blueprint/things/appraisal-template/verbs/create.ts";
import get from "../blueprint/things/appraisal-template/verbs/get.ts";

const d = BigDecimal.fromStringUnsafe;
/** A decimal as plain text with no trailing zeros, so 30 and 30.00 read the same. */
const n = (x: BigDecimal.BigDecimal) => BigDecimal.format(BigDecimal.normalize(x));
const lines = (a: { kras: ReadonlyArray<{ kra: string; weightage: BigDecimal.BigDecimal }>; criteria: ReadonlyArray<{ criteria: string; weightage: BigDecimal.BigDecimal }> }) => [
  a.kras.map((k) => [k.kra, n(k.weightage)]),
  a.criteria.map((c) => [c.criteria, n(c.weightage)]),
];

export default Blueprint.journey("set up appraisal templates", {
  // Ada runs Acme Trading, with the KRAs Quality and Development and the criteria Problem Solving and Excellence, and
  // Acme Logistics, with the KRA Safety and the criteria Punctuality. Bo drives for Acme Logistics.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "an outside criteria",
  steps: (s) => [
    s.step(
      "Ada makes a template of two KRAs and two criteria",
      s.ada.run(create, {
        company: s.world.company,
        title: "Engineers",
        kras: [{ kra: s.world.kra, weightage: d("30") }, { kra: s.world.otherKra, weightage: d("70") }],
        criteria: [{ criteria: s.world.criteria, weightage: d("70") }, { criteria: s.world.otherCriteria, weightage: d("30") }],
      }),
      expect((a) => a.appraisalTemplate).toMatch(/^apt_[0-9a-z]+$/),
      emits(AppraisalTemplateCreated, { appraisalTemplate: s.last.appraisalTemplate, company: s.world.company }),
      templates.isIn(s.last.appraisalTemplate, "active"),
      spans({ present: ["appraisal-template.create", "appraisal-template.create.load", "appraisal-template.create.insert"] }),
    ),
    s.step("Bo can't read it", s.bo.run(get, { id: s.last.appraisalTemplate }), refuses(Blueprint.NotAllowed), noEvents()),
    s.step(
      "it reads back with each line in the order given",
      s.ada.run(get, { id: s.last.appraisalTemplate }),
      expect((a) => [a.company, a.title, a.state, ...lines(a)]).toEqual([
        s.world.company,
        "Engineers",
        "active",
        [[s.world.kra, "30"], [s.world.otherKra, "70"]],
        [[s.world.criteria, "70"], [s.world.otherCriteria, "30"]],
      ]),
      noEvents(),
    ),
    s.step(
      "Bo can't make one in Acme Trading",
      s.bo.run(create, { company: s.world.company, title: "Bo's", kras: [{ kra: s.world.kra, weightage: d("100") }], criteria: [] }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["appraisal-template.create.insert"] }),
    ),
    s.step(
      "a template with no criteria and weightages in hundredths is allowed",
      s.ada.run(create, {
        company: s.world.company,
        title: "Thirds",
        kras: [{ kra: s.world.kra, weightage: d("33.33") }, { kra: s.world.otherKra, weightage: d("66.67") }],
        criteria: [],
      }),
      expect((a) => a.appraisalTemplate).toMatch(/^apt_[0-9a-z]+$/),
    ),
    s.step(
      "it reads back with its hundredths and no criteria",
      s.ada.run(get, { id: s.last.appraisalTemplate }),
      expect((a) => [a.title, ...lines(a)]).toEqual(["Thirds", [[s.world.kra, "33.33"], [s.world.otherKra, "66.67"]], []]),
      noEvents(),
    ),
    s.step(
      "one KRA may carry the whole hundred, and criteria in tenths",
      s.ada.run(create, {
        company: s.world.company,
        title: "Quality only",
        kras: [{ kra: s.world.kra, weightage: d("100") }],
        criteria: [{ criteria: s.world.criteria, weightage: d("10.1") }, { criteria: s.world.otherCriteria, weightage: d("89.9") }],
      }),
      expect((a) => a.appraisalTemplate).toMatch(/^apt_[0-9a-z]+$/),
    ),
    s.step(
      "it reads back as typed",
      s.ada.run(get, { id: s.last.appraisalTemplate }),
      expect((a) => [a.title, ...lines(a)]).toEqual(["Quality only", [[s.world.kra, "100"]], [[s.world.criteria, "10.1"], [s.world.otherCriteria, "89.9"]]]),
      noEvents(),
    ),
    s.step(
      "KRAs a hundredth short of 100 are refused",
      s.ada.run(create, {
        company: s.world.company,
        title: "Short",
        kras: [{ kra: s.world.kra, weightage: d("30") }, { kra: s.world.otherKra, weightage: d("69.99") }],
        criteria: [],
      }),
      refuses(KraWeightageNotHundred),
      noEvents(),
      spans({ absent: ["appraisal-template.create.insert"] }),
    ),
    s.step(
      "and so are KRAs a hundredth over",
      s.ada.run(create, {
        company: s.world.company,
        title: "Over",
        kras: [{ kra: s.world.kra, weightage: d("30.01") }, { kra: s.world.otherKra, weightage: d("70") }],
        criteria: [],
      }),
      refuses(KraWeightageNotHundred),
      noEvents(),
    ),
    s.step(
      "and one KRA of 50 alone",
      s.ada.run(create, { company: s.world.company, title: "Half", kras: [{ kra: s.world.kra, weightage: d("50") }], criteria: [] }),
      refuses(KraWeightageNotHundred),
      noEvents(),
    ),
    s.step(
      "criteria a hundredth short of 100 are refused, though the KRAs total 100",
      s.ada.run(create, {
        company: s.world.company,
        title: "Short criteria",
        kras: [{ kra: s.world.kra, weightage: d("100") }],
        criteria: [{ criteria: s.world.criteria, weightage: d("70") }, { criteria: s.world.otherCriteria, weightage: d("29.99") }],
      }),
      refuses(CriteriaWeightageNotHundred),
      noEvents(),
    ),
    s.step(
      "and criteria over 100",
      s.ada.run(create, {
        company: s.world.company,
        title: "Over criteria",
        kras: [{ kra: s.world.kra, weightage: d("100") }],
        criteria: [{ criteria: s.world.criteria, weightage: d("70") }, { criteria: s.world.otherCriteria, weightage: d("40") }],
      }),
      refuses(CriteriaWeightageNotHundred),
      noEvents(),
    ),
    s.step(
      "when both totals are off, the KRAs' is judged first",
      s.ada.run(create, {
        company: s.world.company,
        title: "Both off",
        kras: [{ kra: s.world.kra, weightage: d("30") }, { kra: s.world.otherKra, weightage: d("60") }],
        criteria: [{ criteria: s.world.criteria, weightage: d("50") }, { criteria: s.world.otherCriteria, weightage: d("40") }],
      }),
      refuses(KraWeightageNotHundred),
      noEvents(),
    ),
    s.step(
      "a line of weightage 0 is refused, though the total is 100",
      s.ada.run(create, {
        company: s.world.company,
        title: "Zero line",
        kras: [{ kra: s.world.kra, weightage: d("0") }, { kra: s.world.otherKra, weightage: d("100") }],
        criteria: [],
      }),
      refuses(TemplateWeightageOutOfRange),
      noEvents(),
    ),
    s.step(
      "and so are a line over 100 and a negative one that make 100 between them",
      s.ada.run(create, {
        company: s.world.company,
        title: "Lopsided",
        kras: [{ kra: s.world.kra, weightage: d("150") }, { kra: s.world.otherKra, weightage: d("-50") }],
        criteria: [],
      }),
      refuses(TemplateWeightageOutOfRange),
      noEvents(),
    ),
    s.step(
      "and a criteria of weightage 0, before the criteria's total",
      s.ada.run(create, {
        company: s.world.company,
        title: "Zero criteria",
        kras: [{ kra: s.world.kra, weightage: d("100") }],
        criteria: [{ criteria: s.world.criteria, weightage: d("0") }, { criteria: s.world.otherCriteria, weightage: d("90") }],
      }),
      refuses(TemplateWeightageOutOfRange),
      noEvents(),
    ),
    s.step(
      "a template with no KRA is refused, even with criteria from another company",
      s.ada.run(create, { company: s.world.company, title: "Empty", kras: [], criteria: [{ criteria: s.world.outsideCriteria, weightage: d("100") }] }),
      refuses(TemplateWithoutKras),
      noEvents(),
    ),
    s.step(
      "a KRA of Acme Logistics is refused, judged before a criteria of Acme Logistics",
      s.ada.run(create, {
        company: s.world.company,
        title: "Mixed",
        kras: [{ kra: s.world.kra, weightage: d("50") }, { kra: s.world.outsideKra, weightage: d("50") }],
        criteria: [{ criteria: s.world.outsideCriteria, weightage: d("100") }],
      }),
      refuses(TemplateKraNotInCompany),
      noEvents(),
    ),
    s.step(
      "a criteria of Acme Logistics is refused, judged before a repeated KRA",
      s.ada.run(create, {
        company: s.world.company,
        title: "Mixed criteria",
        kras: [{ kra: s.world.kra, weightage: d("50") }, { kra: s.world.kra, weightage: d("50") }],
        criteria: [{ criteria: s.world.criteria, weightage: d("50") }, { criteria: s.world.outsideCriteria, weightage: d("50") }],
      }),
      refuses(TemplateCriteriaNotInCompany),
      noEvents(),
    ),
    s.step(
      "a KRA listed twice is refused, judged before a line of weightage 0",
      s.ada.run(create, {
        company: s.world.company,
        title: "Twice",
        kras: [{ kra: s.world.kra, weightage: d("100") }, { kra: s.world.kra, weightage: d("0") }],
        criteria: [],
      }),
      refuses(TemplateLineRepeated),
      noEvents(),
    ),
    s.step(
      "and so is a criteria listed twice",
      s.ada.run(create, {
        company: s.world.company,
        title: "Twice criteria",
        kras: [{ kra: s.world.kra, weightage: d("100") }],
        criteria: [{ criteria: s.world.criteria, weightage: d("50") }, { criteria: s.world.criteria, weightage: d("50") }],
      }),
      refuses(TemplateLineRepeated),
      noEvents(),
    ),
    s.step(
      "a title taken in Acme Trading is refused",
      s.ada.run(create, { company: s.world.company, title: "Engineers", kras: [{ kra: s.world.kra, weightage: d("100") }], criteria: [] }),
      refuses(TemplateTitleTaken, { title: "Engineers" }),
      noEvents(),
    ),
    s.step(
      "a taken title is judged after the weightages",
      s.ada.run(create, { company: s.world.company, title: "Engineers", kras: [{ kra: s.world.kra, weightage: d("99") }], criteria: [] }),
      refuses(KraWeightageNotHundred),
      noEvents(),
    ),
    s.step(
      "Acme Logistics may use the title for its own KRA and criteria",
      s.ada.run(create, {
        company: s.world.otherCompany,
        title: "Engineers",
        kras: [{ kra: s.world.outsideKra, weightage: d("100") }],
        criteria: [{ criteria: s.world.outsideCriteria, weightage: d("100") }],
      }),
      expect((a) => a.appraisalTemplate).toMatch(/^apt_[0-9a-z]+$/),
      emits(AppraisalTemplateCreated, { appraisalTemplate: s.last.appraisalTemplate, company: s.world.otherCompany }),
    ),
    s.step(
      "but not with Acme Trading's KRA",
      s.ada.run(create, { company: s.world.otherCompany, title: "Borrowed", kras: [{ kra: s.world.kra, weightage: d("100") }], criteria: [] }),
      refuses(TemplateKraNotInCompany),
      noEvents(),
    ),
  ],
});
