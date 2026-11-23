use aztec::{macros::notes::note, protocol::{address::AztecAddress, traits::{Deserialize, Packable, Serialize}}};

// The allowance machine's states, numbered as the budgets declaration's machine says: 0 is a row that is not there.
pub global ACTIVE: u8 = 1;
pub global EXHAUSTED: u8 = 2;
pub global REVOKED: u8 = 3;

// Proposal states. 0 is absent.
pub global OPEN: u8 = 1;
pub global PASSED: u8 = 2;
pub global FAILED: u8 = 3;

// One Allowance row (examples/budgets: id, safe, member, token, limit, spent), as a note owned by the club's own
// keyed address, so the treasurer can replace it on revoke (noir-private-core finding 3). `safe` is the club itself,
// and `token` is left out: this spike does not move a token (see the README).
#[derive(Eq, Packable)]
#[note]
pub struct AllowanceNote {
    pub member: AztecAddress,
    pub limit: u128,
    pub spent: u128,
    pub state: u8,
}

// Membership, owned by the member: only the member (and the treasurer who made it) knows it exists.
#[derive(Eq, Packable)]
#[note]
pub struct MemberNote {
    pub member: AztecAddress,
}

#[derive(Eq, Packable, Serialize, Deserialize)]
pub struct Proposal {
    pub state: u8,
    pub amount: u128,
    pub yes: u32,
    pub no: u32,
}

// The club's public footprint: counts and totals, never a member.
#[derive(Eq, Packable, Serialize, Deserialize)]
pub struct Footprint {
    pub members: u32,
    pub spent: u128,
    pub spends: u32,
}
