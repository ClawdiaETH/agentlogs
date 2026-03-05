// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentCollectionV2
 * @notice Combined ERC-721 + fixed-price sale for AI agent daily art.
 *         V2 adds mintTo() for migration and burn() for abandoning pieces.
 *         Price = startPrice + (tokenId - 1) * priceIncrement
 */
contract AgentCollectionV2 is ERC721URIStorage, Ownable {
    uint256 public startPrice;
    uint256 public priceIncrement;
    uint256 private _nextTokenId;
    address public immutable treasury;

    struct Listing {
        uint256 price;
        bool isListed;
    }

    mapping(uint256 => Listing) private listings;

    event TokenListed(uint256 indexed tokenId, uint256 price);
    event TokenSold(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event TokenDelisted(uint256 indexed tokenId);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 _startPrice,
        uint256 _priceIncrement,
        address _treasury
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        require(_treasury != address(0), "AgentCollectionV2: zero treasury");
        startPrice = _startPrice;
        priceIncrement = _priceIncrement;
        treasury = _treasury;
    }

    /**
     * @notice Mint a new token to the owner and auto-list it.
     * @param uri IPFS metadata URI for this token
     * @return tokenId The minted token ID
     */
    function mint(string calldata uri) external onlyOwner returns (uint256) {
        _nextTokenId++;
        uint256 tokenId = _nextTokenId;

        _mint(owner(), tokenId);
        _setTokenURI(tokenId, uri);

        uint256 price = getPrice(tokenId);
        listings[tokenId] = Listing({ price: price, isListed: true });

        emit TokenListed(tokenId, price);
        return tokenId;
    }

    /**
     * @notice Mint a new token to an arbitrary address (migration helper).
     *         If `to` is the owner, auto-lists (same as mint).
     *         If `to` is someone else, no listing (piece already sold).
     * @param to Address to receive the token
     * @param uri IPFS metadata URI for this token
     * @return tokenId The minted token ID
     */
    function mintTo(address to, string calldata uri) external onlyOwner returns (uint256) {
        _nextTokenId++;
        uint256 tokenId = _nextTokenId;

        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);

        if (to == owner()) {
            uint256 price = getPrice(tokenId);
            listings[tokenId] = Listing({ price: price, isListed: true });
            emit TokenListed(tokenId, price);
        }

        return tokenId;
    }

    /**
     * @notice Burn a token held by the owner (for abandoning pieces).
     * @param tokenId The token ID to burn
     */
    function burn(uint256 tokenId) external onlyOwner {
        require(tokenId == _nextTokenId, "AgentCollectionV2: can only burn latest token");
        require(ownerOf(tokenId) == owner(), "AgentCollectionV2: not held by owner");
        if (listings[tokenId].isListed) {
            listings[tokenId].isListed = false;
            emit TokenDelisted(tokenId);
        }
        _burn(tokenId);
        _nextTokenId--;
    }

    /**
     * @notice Buy a listed token. Send exact ETH.
     * @param tokenId The token ID to purchase
     */
    function buy(uint256 tokenId) external payable {
        Listing storage listing = listings[tokenId];
        require(listing.isListed, "AgentCollectionV2: not listed");
        require(msg.value == listing.price, "AgentCollectionV2: wrong price");

        listing.isListed = false;

        _transfer(ownerOf(tokenId), msg.sender, tokenId);

        uint256 fee = msg.value / 20;
        uint256 ownerAmount = msg.value - fee;

        (bool s1, ) = payable(owner()).call{value: ownerAmount}("");
        require(s1, "AgentCollectionV2: owner transfer failed");
        (bool s2, ) = payable(treasury).call{value: fee}("");
        require(s2, "AgentCollectionV2: treasury transfer failed");

        emit TokenSold(tokenId, msg.sender, msg.value);
    }

    /**
     * @notice Get price for a given day/token number.
     * @param dayNumber The day number (1-indexed, same as tokenId)
     * @return price in wei
     */
    function getPrice(uint256 dayNumber) public view returns (uint256) {
        require(dayNumber >= 1, "AgentCollectionV2: dayNumber must be >= 1");
        return startPrice + (dayNumber - 1) * priceIncrement;
    }

    /**
     * @notice Get listing details for a token.
     */
    function getListing(uint256 tokenId) external view returns (uint256 price, bool isListed) {
        Listing storage listing = listings[tokenId];
        return (listing.price, listing.isListed);
    }

    /**
     * @notice Delist a token (remove from sale).
     */
    function delist(uint256 tokenId) external onlyOwner {
        require(listings[tokenId].isListed, "AgentCollectionV2: not listed");
        listings[tokenId].isListed = false;
        emit TokenDelisted(tokenId);
    }

    /**
     * @notice Update the metadata URI for an existing token (owner only).
     */
    function setTokenURI(uint256 tokenId, string calldata uri) external onlyOwner {
        _requireOwned(tokenId);
        _setTokenURI(tokenId, uri);
    }

    /**
     * @notice Withdraw any ETH accidentally sent to this contract.
     */
    function rescueETH() external onlyOwner {
        (bool sent, ) = payable(owner()).call{value: address(this).balance}("");
        require(sent, "AgentCollectionV2: rescue failed");
    }

    /**
     * @notice Total tokens currently tracked by sequential token IDs.
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
}
