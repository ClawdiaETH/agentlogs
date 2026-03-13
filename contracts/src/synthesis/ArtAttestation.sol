// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title ArtAttestation
 * @notice Onchain attestations for agent-generated art quality and authenticity.
 * Collectors can attest to NFTs, building composable reputation for agents.
 *
 * Theme: "Agents that trust" — verifiable service quality, onchain attestations.
 */
contract ArtAttestation {
    struct Attestation {
        address attester;      // Wallet that created the attestation
        uint8 rating;          // 1-5 star rating
        bool authentic;        // Collector verifies agent created this
        string comment;        // Optional comment (IPFS hash or short text)
        uint256 timestamp;     // Block timestamp
    }

    // collectionContract => tokenId => attester => Attestation
    mapping(address => mapping(uint256 => mapping(address => Attestation))) public attestations;

    // collectionContract => tokenId => attestation count
    mapping(address => mapping(uint256 => uint256)) public attestationCount;

    // collectionContract => tokenId => sum of ratings (for avg calc)
    mapping(address => mapping(uint256 => uint256)) public ratingSum;

    // collectionContract => tokenId => authenticity confirmations
    mapping(address => mapping(uint256 => uint256)) public authenticityCount;

    event AttestationCreated(
        address indexed collectionContract,
        uint256 indexed tokenId,
        address indexed attester,
        uint8 rating,
        bool authentic
    );

    event AttestationUpdated(
        address indexed collectionContract,
        uint256 indexed tokenId,
        address indexed attester,
        uint8 rating,
        bool authentic
    );

    /**
     * @notice Create or update an attestation for an NFT.
     * @param collectionContract Address of the NFT collection
     * @param tokenId Token ID within the collection
     * @param rating 1-5 star rating
     * @param authentic True if collector verifies agent created this
     * @param comment Optional comment (IPFS hash or short text)
     */
    function attest(
        address collectionContract,
        uint256 tokenId,
        uint8 rating,
        bool authentic,
        string calldata comment
    ) external {
        require(collectionContract != address(0), "Invalid collection");
        require(rating >= 1 && rating <= 5, "Rating must be 1-5");
        require(IERC721(collectionContract).ownerOf(tokenId) == msg.sender, "Not token owner");

        bool isUpdate = attestations[collectionContract][tokenId][msg.sender].attester != address(0);

        if (isUpdate) {
            // Update existing attestation
            Attestation storage existing = attestations[collectionContract][tokenId][msg.sender];

            // Adjust rating sum
            ratingSum[collectionContract][tokenId] = ratingSum[collectionContract][tokenId] - existing.rating + rating;

            // Adjust authenticity count
            if (existing.authentic && !authentic) {
                authenticityCount[collectionContract][tokenId]--;
            } else if (!existing.authentic && authentic) {
                authenticityCount[collectionContract][tokenId]++;
            }

            existing.rating = rating;
            existing.authentic = authentic;
            existing.comment = comment;
            existing.timestamp = block.timestamp;

            emit AttestationUpdated(collectionContract, tokenId, msg.sender, rating, authentic);
        } else {
            // Create new attestation
            attestations[collectionContract][tokenId][msg.sender] = Attestation({
                attester: msg.sender,
                rating: rating,
                authentic: authentic,
                comment: comment,
                timestamp: block.timestamp
            });

            attestationCount[collectionContract][tokenId]++;
            ratingSum[collectionContract][tokenId] += rating;
            if (authentic) {
                authenticityCount[collectionContract][tokenId]++;
            }

            emit AttestationCreated(collectionContract, tokenId, msg.sender, rating, authentic);
        }
    }

    /**
     * @notice Get attestation stats for an NFT.
     * @return count Total attestation count
     * @return avgRating Average rating (scaled by 100, e.g., 450 = 4.5 stars)
     * @return authenticityPct Percentage of attestations that verified authenticity (scaled by 100)
     */
    function getStats(address collectionContract, uint256 tokenId)
        external
        view
        returns (uint256 count, uint256 avgRating, uint256 authenticityPct)
    {
        count = attestationCount[collectionContract][tokenId];
        if (count == 0) {
            return (0, 0, 0);
        }

        avgRating = (ratingSum[collectionContract][tokenId] * 100) / count;
        authenticityPct = (authenticityCount[collectionContract][tokenId] * 100) / count;
    }

    /**
     * @notice Get a specific attestation.
     */
    function getAttestation(address collectionContract, uint256 tokenId, address attester)
        external
        view
        returns (Attestation memory)
    {
        return attestations[collectionContract][tokenId][attester];
    }

    /**
     * @notice Check if an address has attested to an NFT.
     */
    function hasAttested(address collectionContract, uint256 tokenId, address attester)
        external
        view
        returns (bool)
    {
        return attestations[collectionContract][tokenId][attester].attester != address(0);
    }

    /**
     * @notice Get aggregate reputation for an entire collection.
     * @dev Sums stats across all tokenIds minted (gas-intensive for large collections).
     * @param collectionContract Address of the collection
     * @param maxTokenId Highest token ID to check (must be known off-chain)
     */
    function getCollectionReputation(address collectionContract, uint256 maxTokenId)
        external
        view
        returns (uint256 totalAttestations, uint256 avgRating, uint256 avgAuthenticity)
    {
        uint256 totalRating = 0;
        uint256 totalAuthenticity = 0;

        for (uint256 i = 1; i <= maxTokenId; i++) {
            totalAttestations += attestationCount[collectionContract][i];
            totalRating += ratingSum[collectionContract][i];
            totalAuthenticity += authenticityCount[collectionContract][i];
        }

        if (totalAttestations == 0) {
            return (0, 0, 0);
        }

        avgRating = (totalRating * 100) / totalAttestations;
        avgAuthenticity = (totalAuthenticity * 100) / totalAttestations;
    }
}
