const budget = useBudget(id);

budget.state           // "active"
budget.fields.limit    // public: it lives on a chain
budget.left            // by the contract's own renewal rule
budget.can             // ["spend"] for Ada, ["revoke"] for Bob

<Budget.Root id={id}>
  <Budget.State />
  <Budget.Field name="left" />
  <Budget.Move name="spend">Spend</Budget.Move>
  <Budget.Move name="revoke">Revoke</Budget.Move>
</Budget.Root>
