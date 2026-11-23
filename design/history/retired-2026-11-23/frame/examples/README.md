# Examples: building things with Orthograph

Part of the frame ([`../README.md`](../README.md)). Each example is something we have to build anyway, walked through
in the same shape: the idea, the description, journeys (prose, then executable), blanks and handlers, adapters and
secrets, where data lives, projections and what is generated, proof, and today versus proposed. Together they test
the frame against different kinds of work, so a gap shows up here before it shows up in code.

Start with [`../story.md`](../story.md): one allowance followed from the first idea to production and back. The
examples assume it.

| Example | What it exercises |
|---|---|
| [`agents.md`](agents.md) | durable agent runs with Pi Durable, the `agent` principal, model providers as adapters |
| [`factory.md`](factory.md) | the factory itself as a Orthograph app: missions, tasks, the manager, builders, scorer, verdicts |
| [`../writing-a-feature.md`](../writing-a-feature.md) | the wallets feature, written as a plugin, end to end |
| [`payments.md`](payments.md) | an adapter both ways: Stripe calls out, its webhook in, a refund only a person may make |
| [`notifications.md`](notifications.md) | our own events driving work, the outbox, email through a real local stand-in |
| [`allowance-on-chain.md`](allowance-on-chain.md) | a thing that lives on chain: the Solidity language, Anvil, the relayer and follower |
| [`private-membership.md`](private-membership.md) | proving without revealing: the Noir language, client proofs, an on-chain verifier |
| [`python-sdk.md`](python-sdk.md) | a second language for a client, released to a package index |

Every question these raised is collected in [`../questions.md`](../../../../frame/questions.md).
