# resident

The agent's own Pi Durable conversation, resident in its actor (K40 fix 3; Pi Durable's unit is a conversation that lives for years, so there is one per agent for good and a run is a turn inside it).

`agentActor(Base)` makes the agents' Durable Object class from the host's `Actor`, which the generated Worker hands in (this package depends on no host). When `agent.tell` commits, the actor
submits what it was told to Pi, steering the turn that is running (`whenBusy: "steer"`, the delivering event's id as `requestId`); when no turn is left it commits `idled` itself and
journals `AgentIdled`. Pi's timers fall due on the actor's alarm. `steps()` answers the model steps the conversation committed, which the `calls` probe reads.

The model endpoint comes from the environment (`config`): the scripted stand-in's address in a world (`ORTHO_STAND_MODELS`), VibeProxy for a real run (`MODELS_BASE_URL`), a model per agent kind
(`MODEL_MAIN`, `MODEL_EXECUTOR`). Tools are not wired yet. Test: `resident.test.ts` runs a turn on the stand-in in a real world.
