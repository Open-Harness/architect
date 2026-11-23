import { HandleRelease } from "@plugged-in/web/handle/release.react.tsx";
import { mount } from "./boot.tsx";

mount(<HandleRelease.Confirm handle={new URLSearchParams(location.search).get("handle") ?? ""} />);
