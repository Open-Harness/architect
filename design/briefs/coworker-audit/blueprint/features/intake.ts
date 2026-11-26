// What reaches a manager from outside: email, GitHub, later Slack and WhatsApp.
// `@orthograph/intake` already has Source, Account, Trigger, Thread, Decision and a versioned Policy with the gate;
// the same nouns as Coworker's `docs/model.md`. It lives in `examples/superagent/plugins/intake`
// and is not a package (status row `superagent-extraction`, provisional).
// GAP email: no email adapter exists (`stripe-resend`, provisional). GitHub and Slack adapters generate and pass against stand-ins.
// AARON: connectors "with a view" (docs/connectors.md) are not in intake. Whether a connector's view is a page the
// plugin ships is board decision 6.
export {};
