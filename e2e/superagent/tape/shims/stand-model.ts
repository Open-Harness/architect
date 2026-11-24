// Throwaway: `@orthograph/stand-in-model/stand`, the descriptors of GOAL17-check-harness call 1, as the record writes them.
const command = (name: string) => (args: unknown) => ({ kind: "stand-call" as const, mount: "models", command: name, args });
export const models = {
  seen: command("seen"), hold: command("hold"), held: command("held"), release: command("release"), fail: command("fail"), reset: command("reset"),
  script: command("script"), done: command("done"),
};
