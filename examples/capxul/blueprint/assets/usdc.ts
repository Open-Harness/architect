import { Blueprint } from "orthograph";

// USDC, held in the company's Safe (never at Bridge: CX-bridge-rails), its own asset beside US dollars
// (CX-money-global-payroll). Today's companies report in it. An amount of it is in base units: 1 USDC is 1000000.
export default Blueprint.asset.token({ symbol: "USDC", decimals: 6 });
