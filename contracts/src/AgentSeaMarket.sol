// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title AgentSeaMarket
 * @notice Universal escrow-free ERC721 marketplace.
 *         Sellers keep their NFTs and approve the marketplace.
 *         On buy(), marketplace transfers the NFT and splits payment.
 *         2.5% fee to treasury on each sale.
 */
contract AgentSeaMarket is Ownable {

    struct Listing {
        address seller;   // 20 bytes
        uint96  price;    // 12 bytes — packed into 1 slot with seller
    }

    // nft address => tokenId => listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    uint256 public constant FEE_BPS = 250; // 2.5%
    address public treasury;

    event Listed(address indexed nft, uint256 indexed tokenId, address indexed seller, uint256 price);
    event Sold(address indexed nft, uint256 indexed tokenId, address indexed buyer, uint256 price);
    event Delisted(address indexed nft, uint256 indexed tokenId);

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "AgentSeaMarket: zero treasury");
        treasury = _treasury;
    }

    /**
     * @notice List an NFT for sale.
     * @dev Caller must be ownerOf and have approved this contract.
     */
    function list(address nft, uint256 tokenId, uint256 price) external {
        require(price > 0, "AgentSeaMarket: price must be > 0");
        require(price <= type(uint96).max, "AgentSeaMarket: price overflow");

        IERC721 token = IERC721(nft);
        require(token.ownerOf(tokenId) == msg.sender, "AgentSeaMarket: not owner");
        require(
            token.isApprovedForAll(msg.sender, address(this)) ||
            token.getApproved(tokenId) == address(this),
            "AgentSeaMarket: not approved"
        );

        listings[nft][tokenId] = Listing({
            seller: msg.sender,
            price:  uint96(price)
        });

        emit Listed(nft, tokenId, msg.sender, price);
    }

    /**
     * @notice Buy a listed NFT. Send exact ETH.
     * @dev Deletes listing before transfer (checks-effects-interactions).
     */
    function buy(address nft, uint256 tokenId) external payable {
        Listing memory listing = listings[nft][tokenId];
        require(listing.seller != address(0), "AgentSeaMarket: not listed");
        require(msg.value == listing.price, "AgentSeaMarket: wrong price");

        // Effects: delete listing before external calls
        delete listings[nft][tokenId];

        // Interaction: transfer NFT (reverts if seller no longer owns or revoked approval)
        IERC721(nft).transferFrom(listing.seller, msg.sender, tokenId);

        // Split payment: 97.5% seller, 2.5% treasury
        uint256 fee = (msg.value * FEE_BPS) / 10000;
        uint256 sellerAmount = msg.value - fee;

        (bool s1,) = payable(listing.seller).call{value: sellerAmount}("");
        require(s1, "AgentSeaMarket: seller transfer failed");
        (bool s2,) = payable(treasury).call{value: fee}("");
        require(s2, "AgentSeaMarket: treasury transfer failed");

        emit Sold(nft, tokenId, msg.sender, msg.value);
    }

    /**
     * @notice Delist an NFT (cancel listing).
     * @dev Only the original seller can delist.
     */
    function delist(address nft, uint256 tokenId) external {
        require(listings[nft][tokenId].seller == msg.sender, "AgentSeaMarket: not seller");
        delete listings[nft][tokenId];
        emit Delisted(nft, tokenId);
    }

    /**
     * @notice Get listing details for an NFT.
     */
    function getListing(address nft, uint256 tokenId) external view returns (address seller, uint256 price) {
        Listing memory l = listings[nft][tokenId];
        return (l.seller, uint256(l.price));
    }

    /**
     * @notice Update the treasury address.
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "AgentSeaMarket: zero treasury");
        treasury = _treasury;
    }

    /**
     * @notice Rescue any ETH accidentally sent to this contract.
     */
    function rescueETH() external onlyOwner {
        (bool sent,) = payable(owner()).call{value: address(this).balance}("");
        require(sent, "AgentSeaMarket: rescue failed");
    }
}
