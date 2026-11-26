// Generated from Bridge API 1. Do not edit.
import { Blueprint } from "orthograph";
import { BridgeApiFailure, BridgeInputRefused, BridgeAnswerRefused, BridgeUnreachable } from "../blueprint/things/bridge/errors.ts";
import { door, events as written, standIn } from "./written.ts";

export { BridgeApiFailure, BridgeInputRefused, BridgeAnswerRefused, BridgeUnreachable };

/** What every call may fail with: the client's four failures, as errors an operation can refuse with. */
const errors = [BridgeApiFailure, BridgeInputRefused, BridgeAnswerRefused, BridgeUnreachable];

export default Blueprint.adapter({
  description: "Bridge API 1: every call and event its published description lists.",
  calls: {
    "apiKeys": {
      "create": Blueprint.call({ errors }),
      "whoami": {
        "list": Blueprint.call({ errors }),
      },
    },
    "associatedPersons": {
      "delete": Blueprint.call({ errors }),
      "get": Blueprint.call({ errors }),
      "update": Blueprint.call({ errors }),
    },
    "cardholders": {
      "cards": {
        "statements": {
          "create": Blueprint.call({ errors }),
        },
      },
    },
    "cryptoReturnPolicies": {
      "create": Blueprint.call({ errors }),
      "delete": Blueprint.call({ errors }),
      "list": Blueprint.call({ errors }),
      "update": Blueprint.call({ errors }),
    },
    "customers": {
      "associatedPersons": {
        "create": Blueprint.call({ errors }),
        "delete": Blueprint.call({ errors }),
        "get": Blueprint.call({ errors }),
        "list": Blueprint.call({ errors }),
        "update": Blueprint.call({ errors }),
      },
      "batchSettlementSchedules": {
        "create": Blueprint.call({ errors }),
      },
      "cardAccounts": {
        "authControls": {
          "list": Blueprint.call({ errors }),
        },
        "authorizations": {
          "list": Blueprint.call({ errors }),
        },
        "create": Blueprint.call({ errors }),
        "createMobileWalletProvisioningRequest": {
          "create": Blueprint.call({ errors }),
        },
        "depositAddresses": {
          "create": Blueprint.call({ errors }),
        },
        "ephemeralKeys": {
          "create": Blueprint.call({ errors }),
        },
        "freeze": {
          "create": Blueprint.call({ errors }),
        },
        "get": Blueprint.call({ errors }),
        "list": Blueprint.call({ errors }),
        "pin": {
          "create": Blueprint.call({ errors }),
        },
        "statements": {
          "create": Blueprint.call({ errors }),
        },
        "transactions": {
          "get": Blueprint.call({ errors }),
          "list": Blueprint.call({ errors }),
        },
        "unfreeze": {
          "create": Blueprint.call({ errors }),
        },
        "update": Blueprint.call({ errors }),
        "withdrawals": {
          "create": Blueprint.call({ errors }),
          "get": Blueprint.call({ errors }),
          "list": Blueprint.call({ errors }),
        },
      },
      "create": Blueprint.call({ errors }),
      "delete": Blueprint.call({ errors }),
      "devFeeConfigs": {
        "create": Blueprint.call({ errors }),
        "delete": Blueprint.call({ errors }),
        "list": Blueprint.call({ errors }),
      },
      "externalAccounts": {
        "create": Blueprint.call({ errors }),
        "deactivate": {
          "create": Blueprint.call({ errors }),
        },
        "delete": Blueprint.call({ errors }),
        "get": Blueprint.call({ errors }),
        "list": Blueprint.call({ errors }),
        "reactivate": {
          "create": Blueprint.call({ errors }),
        },
        "update": Blueprint.call({ errors }),
        "verify": {
          "create": Blueprint.call({ errors }),
        },
      },
      "fiatPayoutConfiguration": {
        "list": Blueprint.call({ errors }),
        "update": Blueprint.call({ errors }),
      },
      "get": Blueprint.call({ errors }),
      "kycLink": {
        "list": Blueprint.call({ errors }),
      },
      "liquidationAddresses": {
        "balances": {
          "list": Blueprint.call({ errors }),
        },
        "create": Blueprint.call({ errors }),
        "drains": {
          "execute": {
            "create": Blueprint.call({ errors }),
          },
          "list": Blueprint.call({ errors }),
        },
        "get": Blueprint.call({ errors }),
        "list": Blueprint.call({ errors }),
        "update": Blueprint.call({ errors }),
      },
      "list": Blueprint.call({ errors }),
      "plaidLinkRequests": {
        "create": Blueprint.call({ errors }),
      },
      "simulateKycApproval": {
        "create": Blueprint.call({ errors }),
      },
      "staticMemos": {
        "create": Blueprint.call({ errors }),
        "get": Blueprint.call({ errors }),
        "history": {
          "list": Blueprint.call({ errors }),
        },
        "list": Blueprint.call({ errors }),
        "update": Blueprint.call({ errors }),
      },
      "tosAcceptanceLink": {
        "list": Blueprint.call({ errors }),
      },
      "tosLinks": {
        "create": Blueprint.call({ errors }),
      },
      "transfers": {
        "list": Blueprint.call({ errors }),
        "staticTemplates": {
          "list": Blueprint.call({ errors }),
        },
      },
      "update": Blueprint.call({ errors }),
      "virtualAccounts": {
        "create": Blueprint.call({ errors }),
        "deactivate": {
          "create": Blueprint.call({ errors }),
        },
        "get": Blueprint.call({ errors }),
        "history": {
          "list": Blueprint.call({ errors }),
        },
        "list": Blueprint.call({ errors }),
        "reactivate": {
          "create": Blueprint.call({ errors }),
        },
        "update": Blueprint.call({ errors }),
      },
      "wallets": {
        "create": Blueprint.call({ errors }),
        "get": Blueprint.call({ errors }),
        "list": Blueprint.call({ errors }),
      },
    },
    "devFeeConfigs": {
      "create": Blueprint.call({ errors }),
      "customers": {
        "create": Blueprint.call({ errors }),
      },
      "delete": Blueprint.call({ errors }),
      "get": Blueprint.call({ errors }),
      "list": Blueprint.call({ errors }),
      "update": Blueprint.call({ errors }),
    },
    "developer": {
      "cards": {
        "designs": {
          "list": Blueprint.call({ errors }),
        },
        "summary": {
          "list": Blueprint.call({ errors }),
        },
      },
      "feeExternalAccount": {
        "create": Blueprint.call({ errors }),
        "list": Blueprint.call({ errors }),
      },
      "fees": {
        "create": Blueprint.call({ errors }),
        "list": Blueprint.call({ errors }),
      },
    },
    "exchangeRates": {
      "list": Blueprint.call({ errors }),
    },
    "externalAccounts": {
      "list": Blueprint.call({ errors }),
    },
    "fees": {
      "configurations": {
        "create": Blueprint.call({ errors }),
        "get": Blueprint.call({ errors }),
        "list": Blueprint.call({ errors }),
        "update": Blueprint.call({ errors }),
      },
    },
    "fundsRequests": {
      "list": Blueprint.call({ errors }),
    },
    "kycLinks": {
      "create": Blueprint.call({ errors }),
      "get": Blueprint.call({ errors }),
      "list": Blueprint.call({ errors }),
    },
    "liquidationAddresses": {
      "drains": {
        "list": Blueprint.call({ errors }),
        "pending": {
          "list": Blueprint.call({ errors }),
        },
      },
      "list": Blueprint.call({ errors }),
    },
    "lists": {
      "countries": {
        "list": Blueprint.call({ errors }),
      },
      "occupationCodes": {
        "list": Blueprint.call({ errors }),
      },
    },
    "plaidExchangePublicToken": {
      "create": Blueprint.call({ errors }),
    },
    "prefundedAccounts": {
      "get": Blueprint.call({ errors }),
      "history": {
        "list": Blueprint.call({ errors }),
      },
      "list": Blueprint.call({ errors }),
    },
    "rewards": {
      "customer": {
        "get": Blueprint.call({ errors }),
        "history": {
          "list": Blueprint.call({ errors }),
        },
      },
      "get": Blueprint.call({ errors }),
      "history": {
        "list": Blueprint.call({ errors }),
      },
    },
    "rfis": {
      "get": Blueprint.call({ errors }),
      "list": Blueprint.call({ errors }),
      "responses": {
        "create": Blueprint.call({ errors }),
      },
    },
    "staticMemos": {
      "history": {
        "list": Blueprint.call({ errors }),
      },
      "list": Blueprint.call({ errors }),
    },
    "transfers": {
      "create": Blueprint.call({ errors }),
      "delete": Blueprint.call({ errors }),
      "execute": {
        "create": Blueprint.call({ errors }),
      },
      "get": Blueprint.call({ errors }),
      "list": Blueprint.call({ errors }),
      "pending": {
        "list": Blueprint.call({ errors }),
      },
      "staticTemplates": {
        "list": Blueprint.call({ errors }),
      },
      "update": Blueprint.call({ errors }),
    },
    "travelRuleData": {
      "create": Blueprint.call({ errors }),
    },
    "virtualAccounts": {
      "history": {
        "list": Blueprint.call({ errors }),
      },
      "list": Blueprint.call({ errors }),
    },
    "wallets": {
      "get": Blueprint.call({ errors }),
      "history": {
        "list": Blueprint.call({ errors }),
      },
      "list": Blueprint.call({ errors }),
      "totalBalances": {
        "list": Blueprint.call({ errors }),
      },
    },
    "webhookEvents": {
      "list": Blueprint.call({ errors }),
    },
    "webhooks": {
      "create": Blueprint.call({ errors }),
      "delete": Blueprint.call({ errors }),
      "events": {
        "list": Blueprint.call({ errors }),
      },
      "list": Blueprint.call({ errors }),
      "logs": {
        "list": Blueprint.call({ errors }),
      },
      "send": {
        "create": Blueprint.call({ errors }),
      },
      "update": Blueprint.call({ errors }),
    },
  },
  events: {
    ...written,
  },
  standIn,
  ...(door === undefined ? {} : { door }),
});
