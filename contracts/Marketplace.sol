// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

import "./Token.sol";
import './NFT.sol';

contract Marketplace is AccessControl {
    uint public auctionId;
    address public tokenAddress;
    address public nftAddress;
    uint public itemId;

    //events
    event ItemCreated (
        uint tokenId,
        address creator,
        uint price
    );

    event SaleStarted (
        uint tokenId,
        address seller,
        uint price
    );

    event Sale (
        uint tokenId,
        address seller,
        address buyer,
        bool primarySale,
        uint price
    );

    event AuctionStarted (
        uint tokenId,
        address nftSeller,
        uint minPrice
    );

    event Bid (
        uint auctionId,
        uint currentBestPrize,
        address currentRecipient
    );

    event AuctionEnded (
        uint tokenId,
        uint price,
        address winner
    );

    //function modifiers
    modifier exists(uint _itemId) {
        require(itemIdToOwner[_itemId] != address(0), 'That item does not exist');
        _;
    }

    modifier ifItemOwner(uint _itemId) {
        require(items[_itemId].owner == msg.sender, 'A caller must be the owner of that item');
        _;
    }

     modifier onlyCreator(uint _itemId) {
        require(items[_itemId].creator == msg.sender, 'A caller must be the creator of that item');
        _;
    }

    enum State  {
        FROZEN,
        SALE
    }

    struct Item {
        uint tokenId;
        address creator;
        address owner;
        uint itemId;
        State state;
        uint date;
        bool primarySale;
        uint price;
    }
    struct Auction {
        uint itemId;
        uint minPrice;
        address seller;
        uint startDate;
        uint duration;
        uint currentBestBid;
        address currentRecipient;
    }

    mapping (uint => Item) public items;
    mapping(uint => Auction) public auctions;
    mapping (uint => address) public itemIdToOwner;
    
    constructor (address _tokenAddress, address _nftAddress) {
        tokenAddress = _tokenAddress;
        nftAddress = _nftAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @dev Creates NFT
    /// @param _tokenURI Metadata URI of NFT
    /// @param _fee Royalty payment to the creator
    function createNFT(
        string memory _tokenURI,
        uint _fee) 
        public  {
            uint tokenId = NFT(nftAddress).totalSupply();
            NFT(nftAddress).createToken(msg.sender, _tokenURI, _fee);
            itemIdToOwner[itemId] = msg.sender;
            items[itemId] = Item(
                tokenId,
                msg.sender,
                msg.sender,
                itemId,
                State.FROZEN,
                block.timestamp,
                false,
                0
            );
            itemId++;
            emit ItemCreated (
                tokenId,
                msg.sender,
                0
            );
        }

    /// @dev Starts secondary sales
    /// @param _itemId The ID of the NFT Item
    /// @param _price The price of the NFT
    function startSale(uint _itemId, uint _price) 
        exists(_itemId)
        ifItemOwner(_itemId) 
        public {
        require(_price > 0, '_price must be > 0');
        items[_itemId].state = State.SALE;
        items[_itemId].price = _price;
        emit SaleStarted(
            items[_itemId].tokenId, 
            items[_itemId].owner, 
            items[_itemId].price
        );
    }

    /// @dev Stops sale
    /// @param _itemId The ID of the NFT Item
    function stopSale(uint _itemId) 
        exists(_itemId)
        ifItemOwner(_itemId)
        public {
            items[_itemId].state = State.FROZEN;
        }
    /// @dev Buys NFT item
    /// @param _itemId The ID of the NFT
    function buyNFT(uint _itemId) exists(_itemId) public {
        Item storage item = items[_itemId];
        require(item.state != State.FROZEN, 'The item must not be frozened');
        bool primarySale = item.primarySale;
        address previousOwner = item.owner;
        if(primarySale == false) {
            Token(tokenAddress).transferFrom(msg.sender, item.creator, item.price);
            NFT(nftAddress).transferFrom(item.creator, msg.sender, item.tokenId);
            item.primarySale = true;
        } else {
            NFT(nftAddress).transferWithRoaylties(item.owner, msg.sender, item.price, item.tokenId); 
        }
        item.owner = msg.sender;
        item.state = State.FROZEN;
        emit Sale (
            item.tokenId,
            previousOwner,
            msg.sender,
            primarySale,
            item.price
        );
    }

    /// @dev Buys NFT item
    /// @param _itemId The ID of the NFT Item
    /// @param _minPrice The initial price for the NFT Item
    /// @param _duration The duration of the NFT
    function startAuction(
        uint _itemId,
        uint _minPrice,
        uint _duration) 
        ifItemOwner(_itemId)
        exists(_itemId) external {
            require(_minPrice > 0, "_minPrice  must be > 0");
            require(_duration >= 400, "_duration must be more the one day");
            auctions[auctionId] = Auction(
                _itemId,
                _minPrice,
                items[_itemId].owner,
                block.timestamp,
                _duration,
                0,
                items[_itemId].owner
            );
            auctionId++;
            emit AuctionStarted(
                _itemId,
                items[_itemId].owner,
                _minPrice
            );
        }
    /// @dev Makes BID event and updates the current auction state
    /// @param _auctionId The ID of the auction
    /// @param _bid Placed bid
    function makeBid(uint _auctionId, uint _bid) external {
        _updateCurrentBid(_auctionId, _bid);
        emit Bid(
            _auctionId,
            auctions[_auctionId].currentBestBid,
            auctions[_auctionId].currentRecipient
        );
    }

    ///@dev transfers NFT to the auction winner
    ///@dev if no bets have been made, it remains with the owner
    /// @param _auctionId The ID of the auction
    function settleNFT(uint _auctionId) external {
        Auction memory auction = auctions[_auctionId];
        require(block.timestamp > (auction.startDate + auction.duration), 'that auction must be have ended');
        if(auction.seller != auction.currentRecipient) {
            Token(tokenAddress).transferFrom(auction.currentRecipient, auction.seller, auction.currentBestBid);
            NFT(nftAddress).transferFrom(auction.seller, auction.currentRecipient, auction.itemId);
            items[auction.itemId].owner = auction.currentRecipient;
            items[auction.itemId].price = auction.currentBestBid;
            items[auction.itemId].state = State.FROZEN;
            items[auction.itemId].primarySale = true;
            emit AuctionEnded (
                auction.itemId,
                auction.currentBestBid,
                auction.currentRecipient
            );
        }
    }

    /// @dev Checks that auction exists, has not ended, the offered bid is higher than the current one  and a user has enough funds 
    /// @dev Updates the current auction state
    /// @param _auctionId The ID of the auction
    /// @param _bid Placed bid
    function  _updateCurrentBid(uint _auctionId, uint _bid) internal {
        Auction memory auction = auctions[_auctionId];
        require(auction.minPrice > 0, 'that auction does not exist');
        require(_bid > auction.currentBestBid, 'the offered bid must be higher the current one');
        require(block.timestamp < (auction.startDate + auction.duration), 'that auction has ended');
        require(Token(tokenAddress).balanceOf(msg.sender) >= _bid, 'the balance of a caller must be enough for that bid');
        auction.currentBestBid = _bid;
        auction.currentRecipient = msg.sender;
    }
}
