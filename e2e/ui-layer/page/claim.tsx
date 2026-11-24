import { HandleClaim } from "@plugged-in/web/handle/claim.react.tsx";
import { mount } from "./boot.tsx";

mount(<HandleClaim.Form onDone={(answer: unknown) => (window as unknown as { __ortho: { done: Array<unknown> } }).__ortho.done.push(answer)} />);
