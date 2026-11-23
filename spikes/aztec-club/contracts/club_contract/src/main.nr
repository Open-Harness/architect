// Spike ST4.01: the budgets declaration (examples/budgets on goal/on-chain) and a ballot, written in Noir on Aztec as a
// generator would emit them. Refusal codes ride in assert messages, `[exit] Name { field }` (N1 item 3).
pub mod notes;
use aztec::macros::aztec;

#[aztec]
pub contract Club {
    use crate::notes::{ACTIVE, AllowanceNote, EXHAUSTED, FAILED, Footprint, MemberNote, OPEN, PASSED, Proposal, REVOKED};
    use aztec::{
        macros::{events::event, functions::{external, initializer, only_self, view}, storage::storage},
        messages::delivery::MessageDelivery,
        note::note_getter_options::NoteGetterOptions,
        protocol::address::AztecAddress,
        state_vars::{Map, Owned, PrivateMutable, PrivateSet, PublicImmutable, PublicMutable, SingleUseClaim},
    };

    // Public logs. None names a member.
    #[event]
    struct Spent { total: u128, spends: u32 }
    #[event]
    struct BallotCast { proposal: Field, yes: u32, no: u32 }

    #[storage]
    struct Storage<Context> {
        // The treasurer: the `treasury` role. Public in this spike (see the README's open risks).
        treasurer: PublicImmutable<AztecAddress, Context>,
        footprint: PublicMutable<Footprint, Context>,
        // allowance id => the allowance note, owned by the club's address (its key is shared with members).
        allowances: Map<Field, Owned<PrivateMutable<AllowanceNote, Context>, Context>, Context>,
        members: Owned<PrivateSet<MemberNote, Context>, Context>,
        proposals: Map<Field, PublicMutable<Proposal, Context>, Context>,
        // proposal => member => one ballot (a nullifier keyed by the member's secret).
        ballots: Map<Field, Owned<SingleUseClaim<Context>, Context>, Context>,
    }

    #[contract_library_method]
    fn quiet(club: AztecAddress) -> aztec::messages::delivery::OnchainUnconstrainedDelivery {
        MessageDelivery::onchain_unconstrained().with_sender(club).via_address_derived_secret()
    }

    #[external("public")]
    #[initializer]
    fn constructor(treasurer: AztecAddress) {
        self.storage.treasurer.initialize(treasurer);
        self.storage.footprint.write(Footprint { members: 0, spent: 0, spends: 0 });
    }

    // ---- membership --------------------------------------------------------------------------------------

    #[external("private")]
    fn join(member: AztecAddress) {
        assert(self.storage.treasurer.read() == self.msg_sender(), "[AR-001] NotAllowed");
        self.storage.members.at(member).insert(MemberNote { member })
            .deliver_to(member, MessageDelivery::onchain_unconstrained());
        self.enqueue_self._count_member();
    }

    // ---- the budgets declaration: grant, spend, revoke, get ------------------------------------------------

    // grant: from [] to active. allowed: treasury.
    #[external("private")]
    fn grant(allowance: Field, member: AztecAddress, limit: u128) {
        assert(self.storage.treasurer.read() == self.msg_sender(), "[AR-001] NotAllowed");
        let club = self.address;
        // A second grant of the same id fails on the slot's initialization nullifier.
        self.storage.allowances.at(allowance).at(club)
            .initialize(AllowanceNote { member, limit, spent: 0, state: ACTIVE })
            .deliver_to(club, quiet(club));
    }

    // spend: from [active] to [active, exhausted]. allowed: grantee. errors: AllowanceExceeded.
    #[external("private")]
    fn spend(allowance: Field, amount: u128, to: AztecAddress) -> u128 {
        let _ = to; // the recipient: this spike pays no token (README)
        let caller = self.msg_sender();
        let club = self.address;
        let next = self.storage.allowances.at(allowance).at(club).replace(|mut a: AllowanceNote| {
            assert(a.member == caller, "[AR-001] NotAllowed");
            let state = a.state;
            assert(state == ACTIVE, f"[40] AllowanceNotActive {{ state: {state} }}");
            let remaining = a.limit - a.spent;
            assert(amount <= remaining, f"[41] AllowanceExceeded {{ remaining: {remaining} }}");
            a.spent += amount;
            if a.spent == a.limit { a.state = EXHAUSTED; }
            a
        });
        let note = next.get_note();
        next.deliver_to(club, quiet(club));
        self.enqueue_self._add_spent(amount);
        note.limit - note.spent
    }

    // revoke: from [active, exhausted] to revoked. allowed: treasury.
    #[external("private")]
    fn revoke(allowance: Field) {
        assert(self.storage.treasurer.read() == self.msg_sender(), "[AR-001] NotAllowed");
        let club = self.address;
        self.storage.allowances.at(allowance).at(club).replace(|mut a: AllowanceNote| {
            let state = a.state;
            assert((state == ACTIVE) | (state == EXHAUSTED), f"[40] AllowanceNotActive {{ state: {state} }}");
            a.state = REVOKED;
            a
        }).deliver_to(club, quiet(club));
    }

    // get: a read, on the device of anyone holding the club's key.
    #[external("utility")]
    unconstrained fn get(allowance: Field) -> pub (u8, u128, u128) {
        let slot = self.storage.allowances.at(allowance).at(self.address);
        if !slot.is_initialized() { (0, 0, 0) } else { let a = slot.view_note(); (a.state, a.limit, a.spent) }
    }

    // ---- ballots ------------------------------------------------------------------------------------------

    #[external("public")]
    fn propose(proposal: Field, amount: u128) {
        assert(self.storage.treasurer.read() == self.msg_sender(), "[AR-001] NotAllowed");
        assert(self.storage.proposals.at(proposal).read().state == 0, "[PR-002] ProposalExists");
        self.storage.proposals.at(proposal).write(Proposal { state: OPEN, amount, yes: 0, no: 0 });
    }

    #[external("private")]
    fn cast(proposal: Field, choice: bool) {
        let voter = self.msg_sender();
        let mine = self.storage.members.at(voter).get_notes(NoteGetterOptions::new().set_limit(1));
        assert(mine.len() == 1, "[AR-001] NotAllowed");
        // One ballot per (proposal, member secret): a second one repeats this nullifier and is refused.
        self.storage.ballots.at(proposal).at(voter).claim();
        self.enqueue_self._tally(proposal, choice);
    }

    #[external("public")]
    fn close(proposal: Field) {
        assert(self.storage.treasurer.read() == self.msg_sender(), "[AR-001] NotAllowed");
        let mut p = self.storage.proposals.at(proposal).read();
        let state = p.state;
        assert(state == OPEN, f"[PR-900] ProposalNotOpen {{ state: {state} }}");
        p.state = if p.yes > p.no { PASSED } else { FAILED };
        self.storage.proposals.at(proposal).write(p);
    }

    #[external("public")]
    #[view]
    fn proposal(proposal: Field) -> Proposal { self.storage.proposals.at(proposal).read() }

    #[external("public")]
    #[view]
    fn footprint() -> Footprint { self.storage.footprint.read() }

    // ---- enqueued public halves ---------------------------------------------------------------------------

    #[external("public")]
    #[only_self]
    fn _count_member() {
        let mut f = self.storage.footprint.read();
        f.members += 1;
        self.storage.footprint.write(f);
    }

    #[external("public")]
    #[only_self]
    fn _add_spent(amount: u128) {
        let mut f = self.storage.footprint.read();
        f.spent += amount;
        f.spends += 1;
        self.storage.footprint.write(f);
        self.emit(Spent { total: f.spent, spends: f.spends });
    }

    #[external("public")]
    #[only_self]
    fn _tally(proposal: Field, choice: bool) {
        let mut p = self.storage.proposals.at(proposal).read();
        let state = p.state;
        assert(state == OPEN, f"[PR-900] ProposalNotOpen {{ state: {state} }}");
        if choice { p.yes += 1; } else { p.no += 1; }
        self.storage.proposals.at(proposal).write(p);
        self.emit(BallotCast { proposal, yes: p.yes, no: p.no });
    }
}
