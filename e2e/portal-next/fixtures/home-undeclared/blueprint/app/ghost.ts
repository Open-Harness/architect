import { Blueprint } from "orthograph";

// A page value that is not under blueprint/app/pages/, so it is not declared.
export default Blueprint.page({
  description: "Not declared.",
  route: { path: "/ghost", params: {} },
  allowed: [Blueprint.anyone],
});
