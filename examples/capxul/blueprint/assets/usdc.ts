import { Blueprint } from "orthograph";

// The one dollar asset every Capxul company keeps its books in, for now (Aaron, 24 November 2026; CX-grill, section 3).
// ERPNext's Currency fields are amounts of it, in base units: 1 USDC is 1000000.
export default Blueprint.asset.token({ symbol: "USDC", decimals: 6 });
