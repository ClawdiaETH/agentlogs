// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentCollection
 * @notice Combined ERC-721 + fixed-price sale for AI agent daily art.
 *         Each agent deploys one of these. mint() mints + auto-lists.
 *         buy() uses internal _transfer — no approval dance needed.
 *         Price = startPrice + (tokenId - 1) * priceIncrement
 */
contract AgentCollection is ERC721URIStorage, Ownable {
    uint256 public startPrice;
    uint256 public priceIncrement;
    uint256 private _nextTokenId;

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
        uint256 _priceIncrement
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        startPrice = _startPrice;
        priceIncrement = _priceIncrement;
    }

    /**
     * @notice Mint a new token to the owner and auto-list it.
     *         tokenId increments from 1 (tokenId = dayNumber).
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
     * @notice Buy a listed token. Send exact ETH.
     *         Uses internal _transfer — no approval needed.
     * @param tokenId The token ID to purchase
     */
    function buy(uint256 tokenId) external payable {
        Listing storage listing = listings[tokenId];
        require(listing.isListed, "AgentCollection: not listed");
        require(msg.value == listing.price, "AgentCollection: wrong price");

        listing.isListed = false;

        // Internal transfer bypasses approval checks — the listing IS the auth
        _transfer(ownerOf(tokenId), msg.sender, tokenId);

        // Forward ETH to owner
        (bool sent, ) = payable(owner()).call{value: msg.value}("");
        require(sent, "AgentCollection: ETH transfer failed");

        emit TokenSold(tokenId, msg.sender, msg.value);
    }

    /**
     * @notice Get price for a given day/token number.
     * @param dayNumber The day number (1-indexed, same as tokenId)
     * @return price in wei
     */
    function getPrice(uint256 dayNumber) public view returns (uint256) {
        require(dayNumber >= 1, "AgentCollection: dayNumber must be >= 1");
        return startPrice + (dayNumber - 1) * priceIncrement;
    }

    /**
     * @notice Get listing details for a token.
     * @param tokenId The token ID
     * @return price The listing price in wei
     * @return isListed Whether the token is currently listed
     */
    function getListing(uint256 tokenId) external view returns (uint256 price, bool isListed) {
        Listing storage listing = listings[tokenId];
        return (listing.price, listing.isListed);
    }

    /**
     * @notice Delist a token (remove from sale).
     * @param tokenId The token ID to delist
     */
    function delist(uint256 tokenId) external onlyOwner {
        require(listings[tokenId].isListed, "AgentCollection: not listed");
        listings[tokenId].isListed = false;
        emit TokenDelisted(tokenId);
    }

    /**
     * @notice Update the metadata URI for an existing token (owner only).
     *         Useful for correcting metadata after mint.
     * @param tokenId The token ID to update
     * @param uri New IPFS metadata URI
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
        require(sent, "AgentCollection: rescue failed");
    }

    /**
     * @notice Total tokens minted so far.
     */
    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
}
