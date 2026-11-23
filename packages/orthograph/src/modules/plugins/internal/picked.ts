// What a mount picked of a choice: the option it chose, or the choice's first option when it chose none.
import type { AnyChoice, Mount, Option } from "../types.ts";

export const firstOption = (choice: AnyChoice): Option | undefined => {
  const first = Object.keys(choice.options)[0];
  return first === undefined ? undefined : (choice as unknown as Record<string, Option>)[first];
};

/** True when `mount` picked `option`: chosen explicitly, or the default of a choice it left alone. */
export const picked = (mount: Pick<Mount, "verbs">, option: Option): boolean => {
  const chosen = mount.verbs.find((v) => v.verb === "choose" && v.option.choice === option.choice);
  return chosen && chosen.verb === "choose" ? chosen.option === option : firstOption(option.choice) === option;
};
