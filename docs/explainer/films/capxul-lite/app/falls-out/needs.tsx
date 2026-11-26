const proposal = useProposal(id);

proposal.state     // "open"
proposal.can       // ["approve"] for Bob and for Carol
proposal.needs     // one more owner, within 6 days

<Proposal.Root id={id}>
  <Proposal.Needs />
  <Proposal.Move name="approve">Approve</Proposal.Move>
</Proposal.Root>
