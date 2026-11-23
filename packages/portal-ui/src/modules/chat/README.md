# chat

`Chat` holds the twelve chat parts of F7's table (`Conversation`, `Message`, `MessageActions`, `Tool`, `Input`, `Suggestions`,
`List`, `Thinking`, `Loader`, `Shimmer`, `Source`, `Attachment`), each HeroUI Pro's component under our name. They stay thin: the
chat contract (approvals, refusals, screen context) is M1.23 and M1.24's, and the surface over a durable run is M4.16's.
`internal/parts.ts` is the only file that names Pro.

Tests: `chat.test.ts` reads the sources (Pro is not needed to run it); the declared parts and the exported ones must agree.
