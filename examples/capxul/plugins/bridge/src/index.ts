// Generated from Bridge API 1. Do not edit.
import { Blueprint } from "orthograph";
import { door, events as written, standIn } from "./written.ts";

export default Blueprint.adapter({
  description: "Bridge API 1: every call and event its published description lists.",
  calls: {
    "apiKeys": {
      "create": Blueprint.call(),
      "whoami": {
        "list": Blueprint.call(),
      },
    },
    "associatedPersons": {
      "delete": Blueprint.call(),
      "get": Blueprint.call(),
      "update": Blueprint.call(),
    },
    "cardholders": {
      "cards": {
        "statements": {
          "create": Blueprint.call(),
        },
      },
    },
    "cryptoReturnPolicies": {
      "create": Blueprint.call(),
      "delete": Blueprint.call(),
      "list": Blueprint.call(),
      "update": Blueprint.call(),
    },
    "customers": {
      "associatedPersons": {
        "create": Blueprint.call(),
        "delete": Blueprint.call(),
        "get": Blueprint.call(),
        "list": Blueprint.call(),
        "update": Blueprint.call(),
      },
      "batchSettlementSchedules": {
        "create": Blueprint.call(),
      },
      "cardAccounts": {
        "authControls": {
          "list": Blueprint.call(),
        },
        "authorizations": {
          "list": Blueprint.call(),
        },
        "create": Blueprint.call(),
        "createMobileWalletProvisioningRequest": {
          "create": Blueprint.call(),
        },
        "depositAddresses": {
          "create": Blueprint.call(),
        },
        "ephemeralKeys": {
          "create": Blueprint.call(),
        },
        "freeze": {
          "create": Blueprint.call(),
        },
        "get": Blueprint.call(),
        "list": Blueprint.call(),
        "pin": {
          "create": Blueprint.call(),
        },
        "statements": {
          "create": Blueprint.call(),
        },
        "transactions": {
          "get": Blueprint.call(),
          "list": Blueprint.call(),
        },
        "unfreeze": {
          "create": Blueprint.call(),
        },
        "update": Blueprint.call(),
        "withdrawals": {
          "create": Blueprint.call(),
          "get": Blueprint.call(),
          "list": Blueprint.call(),
        },
      },
      "create": Blueprint.call(),
      "delete": Blueprint.call(),
      "devFeeConfigs": {
        "create": Blueprint.call(),
        "delete": Blueprint.call(),
        "list": Blueprint.call(),
      },
      "externalAccounts": {
        "create": Blueprint.call(),
        "deactivate": {
          "create": Blueprint.call(),
        },
        "delete": Blueprint.call(),
        "get": Blueprint.call(),
        "list": Blueprint.call(),
        "reactivate": {
          "create": Blueprint.call(),
        },
        "update": Blueprint.call(),
        "verify": {
          "create": Blueprint.call(),
        },
      },
      "fiatPayoutConfiguration": {
        "list": Blueprint.call(),
        "update": Blueprint.call(),
      },
      "get": Blueprint.call(),
      "kycLink": {
        "list": Blueprint.call(),
      },
      "liquidationAddresses": {
        "balances": {
          "list": Blueprint.call(),
        },
        "create": Blueprint.call(),
        "drains": {
          "execute": {
            "create": Blueprint.call(),
          },
          "list": Blueprint.call(),
        },
        "get": Blueprint.call(),
        "list": Blueprint.call(),
        "update": Blueprint.call(),
      },
      "list": Blueprint.call(),
      "plaidLinkRequests": {
        "create": Blueprint.call(),
      },
      "simulateKycApproval": {
        "create": Blueprint.call(),
      },
      "staticMemos": {
        "create": Blueprint.call(),
        "get": Blueprint.call(),
        "history": {
          "list": Blueprint.call(),
        },
        "list": Blueprint.call(),
        "update": Blueprint.call(),
      },
      "tosAcceptanceLink": {
        "list": Blueprint.call(),
      },
      "tosLinks": {
        "create": Blueprint.call(),
      },
      "transfers": {
        "list": Blueprint.call(),
        "staticTemplates": {
          "list": Blueprint.call(),
        },
      },
      "update": Blueprint.call(),
      "virtualAccounts": {
        "create": Blueprint.call(),
        "deactivate": {
          "create": Blueprint.call(),
        },
        "get": Blueprint.call(),
        "history": {
          "list": Blueprint.call(),
        },
        "list": Blueprint.call(),
        "reactivate": {
          "create": Blueprint.call(),
        },
        "update": Blueprint.call(),
      },
      "wallets": {
        "create": Blueprint.call(),
        "get": Blueprint.call(),
        "list": Blueprint.call(),
      },
    },
    "devFeeConfigs": {
      "create": Blueprint.call(),
      "customers": {
        "create": Blueprint.call(),
      },
      "delete": Blueprint.call(),
      "get": Blueprint.call(),
      "list": Blueprint.call(),
      "update": Blueprint.call(),
    },
    "developer": {
      "cards": {
        "designs": {
          "list": Blueprint.call(),
        },
        "summary": {
          "list": Blueprint.call(),
        },
      },
      "feeExternalAccount": {
        "create": Blueprint.call(),
        "list": Blueprint.call(),
      },
      "fees": {
        "create": Blueprint.call(),
        "list": Blueprint.call(),
      },
    },
    "exchangeRates": {
      "list": Blueprint.call(),
    },
    "externalAccounts": {
      "list": Blueprint.call(),
    },
    "fees": {
      "configurations": {
        "create": Blueprint.call(),
        "get": Blueprint.call(),
        "list": Blueprint.call(),
        "update": Blueprint.call(),
      },
    },
    "fundsRequests": {
      "list": Blueprint.call(),
    },
    "kycLinks": {
      "create": Blueprint.call(),
      "get": Blueprint.call(),
      "list": Blueprint.call(),
    },
    "liquidationAddresses": {
      "drains": {
        "list": Blueprint.call(),
        "pending": {
          "list": Blueprint.call(),
        },
      },
      "list": Blueprint.call(),
    },
    "lists": {
      "countries": {
        "list": Blueprint.call(),
      },
      "occupationCodes": {
        "list": Blueprint.call(),
      },
    },
    "plaidExchangePublicToken": {
      "create": Blueprint.call(),
    },
    "prefundedAccounts": {
      "get": Blueprint.call(),
      "history": {
        "list": Blueprint.call(),
      },
      "list": Blueprint.call(),
    },
    "rewards": {
      "customer": {
        "get": Blueprint.call(),
        "history": {
          "list": Blueprint.call(),
        },
      },
      "get": Blueprint.call(),
      "history": {
        "list": Blueprint.call(),
      },
    },
    "rfis": {
      "get": Blueprint.call(),
      "list": Blueprint.call(),
      "responses": {
        "create": Blueprint.call(),
      },
    },
    "staticMemos": {
      "history": {
        "list": Blueprint.call(),
      },
      "list": Blueprint.call(),
    },
    "transfers": {
      "create": Blueprint.call(),
      "delete": Blueprint.call(),
      "execute": {
        "create": Blueprint.call(),
      },
      "get": Blueprint.call(),
      "list": Blueprint.call(),
      "pending": {
        "list": Blueprint.call(),
      },
      "staticTemplates": {
        "list": Blueprint.call(),
      },
      "update": Blueprint.call(),
    },
    "travelRuleData": {
      "create": Blueprint.call(),
    },
    "virtualAccounts": {
      "history": {
        "list": Blueprint.call(),
      },
      "list": Blueprint.call(),
    },
    "wallets": {
      "get": Blueprint.call(),
      "history": {
        "list": Blueprint.call(),
      },
      "list": Blueprint.call(),
      "totalBalances": {
        "list": Blueprint.call(),
      },
    },
    "webhookEvents": {
      "list": Blueprint.call(),
    },
    "webhooks": {
      "create": Blueprint.call(),
      "delete": Blueprint.call(),
      "events": {
        "list": Blueprint.call(),
      },
      "list": Blueprint.call(),
      "logs": {
        "list": Blueprint.call(),
      },
      "send": {
        "create": Blueprint.call(),
      },
      "update": Blueprint.call(),
    },
  },
  events: {
    ...written,
  },
  standIn,
  ...(door === undefined ? {} : { door }),
});
