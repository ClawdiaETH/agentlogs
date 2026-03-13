// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IOwnableCollection {
    function owner() external view returns (address);
}

/**
 * @title ERC8004Registry
 * @notice Onchain registry for AI agents with ERC-8004 identities on Base.
 * Agents register their collection contract + ERC-8004 identity for discovery.
 * No gatekeepers — any agent can self-register.
 *
 * Theme: "Agents that trust" — open discovery protocol, portable credentials.
 */
contract ERC8004Registry {
    struct AgentRegistration {
        address wallet;           // Agent's wallet address
        address collectionContract; // AgentCollectionV2 contract
        address erc8004Identity;  // ERC-8004 agent identity contract (on Base)
        uint256 erc8004TokenId;   // Token ID within the ERC-8004 contract
        string name;              // Agent display name
        string metadataURI;       // Off-chain metadata (avatar, bio, etc.)
        uint256 registeredAt;     // Block timestamp
        bool active;              // Can be deactivated by agent
    }

    mapping(address => AgentRegistration) public agents; // wallet => registration
    address[] public agentList; // For enumeration

    event AgentRegistered(
        address indexed wallet,
        address indexed collectionContract,
        address indexed erc8004Identity,
        uint256 erc8004TokenId,
        string name
    );
    event AgentUpdated(address indexed wallet, string metadataURI);
    event AgentDeactivated(address indexed wallet);
    event AgentReactivated(address indexed wallet);

    /**
     * @notice Register an agent with ERC-8004 identity.
     * @param collectionContract Address of the agent's AgentCollectionV2 contract
     * @param erc8004Identity Address of the ERC-8004 identity contract on Base
     * @param erc8004TokenId Token ID within the ERC-8004 contract
     * @param name Agent display name
     * @param metadataURI Off-chain metadata URI (IPFS, etc.)
     */
    function register(
        address collectionContract,
        address erc8004Identity,
        uint256 erc8004TokenId,
        string calldata name,
        string calldata metadataURI
    ) external {
        require(collectionContract != address(0), "Invalid collection");
        require(erc8004Identity != address(0), "Invalid ERC-8004 identity");
        require(bytes(name).length > 0, "Name required");
        require(agents[msg.sender].wallet == address(0), "Already registered");
        require(IERC721(erc8004Identity).ownerOf(erc8004TokenId) == msg.sender, "Not identity owner");
        require(_getCollectionOwner(collectionContract) == msg.sender, "Not collection owner");

        agentList.push(msg.sender);

        agents[msg.sender] = AgentRegistration({
            wallet: msg.sender,
            collectionContract: collectionContract,
            erc8004Identity: erc8004Identity,
            erc8004TokenId: erc8004TokenId,
            name: name,
            metadataURI: metadataURI,
            registeredAt: block.timestamp,
            active: true
        });

        emit AgentRegistered(msg.sender, collectionContract, erc8004Identity, erc8004TokenId, name);
    }

    function _getCollectionOwner(address collectionContract) internal view returns (address) {
        try IOwnableCollection(collectionContract).owner() returns (address owner) {
            return owner;
        } catch {
            return address(0);
        }
    }

    /**
     * @notice Update metadata URI (agent can update bio, avatar, etc.)
     */
    function updateMetadata(string calldata metadataURI) external {
        require(agents[msg.sender].wallet != address(0), "Not registered");
        agents[msg.sender].metadataURI = metadataURI;
        emit AgentUpdated(msg.sender, metadataURI);
    }

    /**
     * @notice Deactivate agent (hides from discovery, keeps data)
     */
    function deactivate() external {
        require(agents[msg.sender].wallet != address(0), "Not registered");
        agents[msg.sender].active = false;
        emit AgentDeactivated(msg.sender);
    }

    /**
     * @notice Reactivate agent
     */
    function reactivate() external {
        require(agents[msg.sender].wallet != address(0), "Not registered");
        agents[msg.sender].active = true;
        emit AgentReactivated(msg.sender);
    }

    /**
     * @notice Get agent registration by wallet address
     */
    function getAgent(address wallet) external view returns (AgentRegistration memory) {
        return agents[wallet];
    }

    /**
     * @notice Get all active agents (for discovery)
     */
    function getActiveAgents() external view returns (AgentRegistration[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < agentList.length; i++) {
            if (agents[agentList[i]].active) {
                activeCount++;
            }
        }

        AgentRegistration[] memory active = new AgentRegistration[](activeCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < agentList.length; i++) {
            if (agents[agentList[i]].active) {
                active[idx] = agents[agentList[i]];
                idx++;
            }
        }

        return active;
    }

    /**
     * @notice Get total registered agents (active + inactive)
     */
    function totalAgents() external view returns (uint256) {
        return agentList.length;
    }

    /**
     * @notice Get agent by index (for enumeration)
     */
    function getAgentByIndex(uint256 index) external view returns (AgentRegistration memory) {
        require(index < agentList.length, "Index out of bounds");
        return agents[agentList[index]];
    }
}
