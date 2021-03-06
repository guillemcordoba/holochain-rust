//! represents the state of connected agents
use crate::{wire_message::WireMessage, NEW_RELIC_LICENSE_KEY};
use lib3h_protocol::types::{AgentPubKey, SpaceHash};
pub type AgentId = AgentPubKey;

use crate::error::*;

#[derive(Debug, Clone, PartialEq)]
pub enum ConnectionState {
    #[allow(clippy::all)]
    Limbo(Box<Vec<WireMessage>>),
    Joined(SpaceHash, AgentId),
}

#[holochain_tracing_macros::newrelic_autotrace(SIM2H)]
impl ConnectionState {
    pub fn new() -> ConnectionState {
        ConnectionState::Limbo(Box::new(Vec::new()))
    }

    /// construct a new "Joined" ConnectionState item
    #[allow(clippy::borrowed_box)]
    pub fn new_joined(space_hash: SpaceHash, agent_id: AgentId) -> Sim2hResult<Self> {
        Ok(ConnectionState::Joined(space_hash, agent_id))
    }

    pub fn in_limbo(&self) -> bool {
        match self {
            ConnectionState::Limbo(_) => true,
            _ => false,
        }
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[test]
    pub fn test_connection_state() {
        let ca = ConnectionState::new();
        assert_eq!(ca, ConnectionState::Limbo(Box::new(Vec::new())));
    }
}
