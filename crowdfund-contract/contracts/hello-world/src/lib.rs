#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

#[contracttype]
pub struct CrowdfundState {
    pub total_donated: i128,
    pub goal: i128,
    pub owner: Address,
    pub deadline: u64,
}

const STATE: Symbol = symbol_short!("STATE");

#[contract]
pub struct CrowdfundContract;

#[contractimpl]
impl CrowdfundContract {
    pub fn initialize(env: Env, owner: Address, goal: i128, deadline: u64) {
        owner.require_auth();
        let state = CrowdfundState {
            total_donated: 0,
            goal,
            owner,
            deadline,
        };
        env.storage().instance().set(&STATE, &state);
    }

    pub fn donate(env: Env, donor: Address, amount: i128) {
        donor.require_auth();
        let mut state: CrowdfundState = env.storage().instance().get(&STATE).unwrap();
        assert!(amount > 0, "Amount must be positive");
        assert!(env.ledger().timestamp() < state.deadline, "Campaign ended");
        state.total_donated += amount;
        env.storage().instance().set(&STATE, &state);
    }

    pub fn get_state(env: Env) -> CrowdfundState {
        env.storage().instance().get(&STATE).unwrap()
    }

    pub fn is_goal_reached(env: Env) -> bool {
        let state: CrowdfundState = env.storage().instance().get(&STATE).unwrap();
        state.total_donated >= state.goal
    }
}

mod test;