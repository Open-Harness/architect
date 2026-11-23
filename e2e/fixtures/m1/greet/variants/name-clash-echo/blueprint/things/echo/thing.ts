import { Blueprint } from "orthograph";

// Planted: another plugin's thing named echo.
export const Echo = Blueprint.thing({ description: "A second echo.", fields: { id: Blueprint.id("gec") }, code: "GE" });
