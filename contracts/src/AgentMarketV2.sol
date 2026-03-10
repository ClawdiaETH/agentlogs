// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title AgentMarketV2
 * @notice ERC721 marketplace with listings + offers + agent-native actions.
 *         Listings are escrow-free (seller keeps NFT, approves marketplace).
 *         Offers hold ETH in escrow until accepted or cancelled.
 *         2.5% fee to treasury on each sale.
 *
 *         Emits ActionSigned on all state-changing functions, tagging
 *         whether the action was initiated autonomously by a registered agent.
 */
contract AgentMarketV2 is Ownable {

    struct Listing {
        address seller;   // 20 bytes
        uint96  price;    // 12 bytes — packed with seller
    }

    struct Offer {
        uint96  amount;   // 12 bytes
        uint40  expiry;   // 5 bytes (unix timestamp, good until year 36812)
        bool    active;   // 1 byte
    }

    // nft => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    // nft => tokenId => offerer => Offer
    mapping(address => mapping(uint256 => mapping(address => Offer))) public offers;

    // Registered agent wallets (for autonomous action tagging)
    mapping(address => bool) public registeredAgents;

    uint256 public constant FEE_BPS = 250; // 2.5%
    uint256 public constant DEFAULT_OFFER_DURATION = 7 days;
    address public treasury;

    event Listed(address indexed nft, uint256 indexed tokenId, address indexed seller, uint256 price);
    event Sold(address indexed nft, uint256 indexed tokenId, address indexed buyer, uint256 price);
    event Delisted(address indexed nft, uint256 indexed tokenId);
    event OfferMade(address indexed nft, uint256 indexed tokenId, address indexed offerer, uint256 amount, uint256 expiry);
    event OfferAccepted(address indexed nft, uint256 indexed tokenId, address indexed offerer, uint256 amount);
    event OfferCancelled(address indexed nft, uint256 indexed tokenId, address indexed offerer);
    event AgentTransfer(address indexed nft, uint256 indexed tokenId, address indexed to);
    event ActionSigned(address indexed actor, bytes32 actionType, bool autonomous);

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "V2: zero treasury");
        treasury = _treasury;
    }

    // ─── Agent Registry ───────────────────────────────────────────

    function registerAgent(address agent) external onlyOwner {
        registeredAgents[agent] = true;
    }

    function unregisterAgent(address agent) external onlyOwner {
        registeredAgents[agent] = false;
    }

    function _emitAction(bytes32 actionType) internal {
        emit ActionSigned(msg.sender, actionType, registeredAgents[msg.sender]);
    }

    // ─── Listings ─────────────────────────────────────────────────

    /**
     * @notice List an NFT for sale. Caller must own and have approved this contract.
     */
    function list(address nft, uint256 tokenId, uint256 price) external {
        require(price > 0 && price <= type(uint96).max, "V2: invalid price");

        IERC721 token = IERC721(nft);
        require(token.ownerOf(tokenId) == msg.sender, "V2: not owner");
        require(
            token.isApprovedForAll(msg.sender, address(this)) ||
            token.getApproved(tokenId) == address(this),
            "V2: not approved"
        );

        listings[nft][tokenId] = Listing({
            seller: msg.sender,
            price:  uint96(price)
        });

        emit Listed(nft, tokenId, msg.sender, price);
        _emitAction("list");
    }

    /**
     * @notice Delist an NFT (cancel listing). Only the seller can delist.
     */
    function delist(address nft, uint256 tokenId) external {
        require(listings[nft][tokenId].seller == msg.sender, "V2: not seller");
        delete listings[nft][tokenId];
        emit Delisted(nft, tokenId);
        _emitAction("delist");
    }

    /**
     * @notice Buy a listed NFT. Send exact ETH.
     */
    function buy(address nft, uint256 tokenId) external payable {
        Listing memory l = listings[nft][tokenId];
        require(l.seller != address(0), "V2: not listed");
        require(msg.value == l.price, "V2: wrong price");

        delete listings[nft][tokenId];

        IERC721(nft).transferFrom(l.seller, msg.sender, tokenId);
        _splitPayment(l.seller, msg.value);

        emit Sold(nft, tokenId, msg.sender, msg.value);
        _emitAction("buy");
    }

    // ─── Offers ───────────────────────────────────────────────────

    /**
     * @notice Place an offer on any NFT. ETH is held in escrow.
     *         Offer expires after DEFAULT_OFFER_DURATION.
     */
    function makeOffer(address nft, uint256 tokenId) external payable {
        require(msg.value > 0, "V2: zero offer");
        require(msg.value <= type(uint96).max, "V2: offer overflow");
        require(!offers[nft][tokenId][msg.sender].active, "V2: offer exists");

        uint40 expiry = uint40(block.timestamp + DEFAULT_OFFER_DURATION);

        offers[nft][tokenId][msg.sender] = Offer({
            amount: uint96(msg.value),
            expiry: expiry,
            active: true
        });

        emit OfferMade(nft, tokenId, msg.sender, msg.value, expiry);
        _emitAction("makeOffer");
    }

    /**
     * @notice Accept an offer. Callable by the current NFT owner.
     *         Transfers NFT to offerer, pays owner minus fee.
     */
    function acceptOffer(address nft, uint256 tokenId, address offerer) external {
        Offer memory o = offers[nft][tokenId][offerer];
        require(o.active, "V2: no active offer");
        require(block.timestamp <= o.expiry, "V2: offer expired");

        IERC721 token = IERC721(nft);
        require(token.ownerOf(tokenId) == msg.sender, "V2: not owner");
        require(
            token.isApprovedForAll(msg.sender, address(this)) ||
            token.getApproved(tokenId) == address(this),
            "V2: not approved"
        );

        // Effects
        delete offers[nft][tokenId][offerer];
        delete listings[nft][tokenId]; // Clear listing if exists

        // Interactions
        token.transferFrom(msg.sender, offerer, tokenId);
        _splitPayment(msg.sender, o.amount);

        emit OfferAccepted(nft, tokenId, offerer, o.amount);
        _emitAction("acceptOffer");
    }

    /**
     * @notice Cancel an offer and reclaim ETH.
     */
    function cancelOffer(address nft, uint256 tokenId) external {
        Offer memory o = offers[nft][tokenId][msg.sender];
        require(o.active, "V2: no active offer");

        delete offers[nft][tokenId][msg.sender];

        (bool sent,) = payable(msg.sender).call{value: o.amount}("");
        require(sent, "V2: refund failed");

        emit OfferCancelled(nft, tokenId, msg.sender);
        _emitAction("cancelOffer");
    }

    // ─── Agent-Native ─────────────────────────────────────────────

    /**
     * @notice Agent-to-agent direct transfer (gift/trade). No ETH involved.
     *         Caller must own the NFT and have approved this contract.
     */
    function agentTransfer(address nft, uint256 tokenId, address to) external {
        require(to != address(0), "V2: zero recipient");
        IERC721 token = IERC721(nft);
        require(token.ownerOf(tokenId) == msg.sender, "V2: not owner");

        delete listings[nft][tokenId]; // Clear listing if exists
        token.transferFrom(msg.sender, to, tokenId);

        emit AgentTransfer(nft, tokenId, to);
        _emitAction("agentTransfer");
    }

    // ─── Views ────────────────────────────────────────────────────

    function getListing(address nft, uint256 tokenId) external view returns (address seller, uint256 price) {
        Listing memory l = listings[nft][tokenId];
        return (l.seller, uint256(l.price));
    }

    function getOffer(address nft, uint256 tokenId, address offerer) external view returns (uint256 amount, uint256 expiry, bool active) {
        Offer memory o = offers[nft][tokenId][offerer];
        return (uint256(o.amount), uint256(o.expiry), o.active && block.timestamp <= o.expiry);
    }

    // ─── Admin ────────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "V2: zero treasury");
        treasury = _treasury;
    }

    function rescueETH() external onlyOwner {
        (bool sent,) = payable(owner()).call{value: address(this).balance}("");
        require(sent, "V2: rescue failed");
    }

    // ─── Internal ─────────────────────────────────────────────────

    function _splitPayment(address seller, uint256 amount) internal {
        uint256 fee = (amount * FEE_BPS) / 10000;
        uint256 sellerAmount = amount - fee;

        (bool s1,) = payable(seller).call{value: sellerAmount}("");
        require(s1, "V2: seller transfer failed");
        (bool s2,) = payable(treasury).call{value: fee}("");
        require(s2, "V2: treasury transfer failed");
    }
}
