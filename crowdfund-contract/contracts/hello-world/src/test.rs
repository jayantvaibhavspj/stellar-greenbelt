#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(CrowdfundContract, ());
    let client = CrowdfundContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    client.initialize(&owner, &1000000000, &9999999999);

    let state = client.get_state();
    assert_eq!(state.total_donated, 0);
    assert_eq!(state.goal, 1000000000);
}

#[test]
fn test_donate() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(CrowdfundContract, ());
    let client = CrowdfundContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let donor = Address::generate(&env);

    client.initialize(&owner, &1000000000, &9999999999);
    client.donate(&donor, &500);

    let state = client.get_state();
    assert_eq!(state.total_donated, 500);
}

#[test]
fn test_goal_not_reached() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(CrowdfundContract, ());
    let client = CrowdfundContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    client.initialize(&owner, &1000000000, &9999999999);

    assert_eq!(client.is_goal_reached(), false);
}

#[test]
fn test_goal_reached() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(CrowdfundContract, ());
    let client = CrowdfundContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let donor = Address::generate(&env);

    client.initialize(&owner, &100, &9999999999);
    client.donate(&donor, &100);

    assert_eq!(client.is_goal_reached(), true);
}