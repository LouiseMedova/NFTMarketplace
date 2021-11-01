// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

import "./Token.sol";
import './NFT.sol';

contract Market is AccessControl {
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE");

    uint public auctionId;
    address public tokenAddress;
    address public nftAddress;
    uint public chainId;
    
    //events
    event ItemCreated (
        uint tokenId,
        address creator,
        uint price,
        uint chainId
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
    modifier exists(uint _tokenId) {
        require(tokenIdToItems[_tokenId].owner != address(0), 'That item does not exist');
        _;
    }

    modifier ifTokenOwner(uint _tokenId) {
        require(NFT(nftAddress).ownerOf(_tokenId) == msg.sender, 'A caller must be the owner of that token');
        _;
    }

    enum State  {
        FROZEN,
        SALE,
        LOCKED
    }

    struct Item {
        uint tokenId;
        address owner;
        State state;
        uint price;
        uint createdOnChain;
    }

    struct Auction {
        uint tokenId;
        uint minPrice;
        address seller;
        uint startDate;
        uint duration;
        uint currentBestBid;
        address currentRecipient;
    }

    mapping (uint => Item) public tokenIdToItems;
    mapping(uint => Auction) public auctions;
    // NFTs received from other chain
    mapping(uint => bool) private alreadyCopiedNfts;
    // Mapping from NFT IDs from other chain to NFT IDs created on that chain
    mapping(uint => uint) public correspondingIds;
    
    constructor (address _tokenAddress, address _nftAddress, uint _chainId) {
        tokenAddress = _tokenAddress;
        nftAddress = _nftAddress;
        chainId = _chainId;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @dev Creates NFT
    /// @param _tokenURI Metadata URI of NFT
    /// @param _fee Royalty payment to the creator
    function createNFT(
        string memory _tokenURI,
        uint _fee) 
        external  {
            uint tokenId = NFT(nftAddress).totalSupply();
            _createNFT(tokenId, msg.sender, msg.sender, _tokenURI, _fee, chainId);
        }

    /// @dev Starts secondary sales
    /// @param _tokenId The ID of the NFT Token
    /// @param _price The price of the NFT
    function startSale(uint _tokenId, uint _price) 
        exists(_tokenId)
        ifTokenOwner(_tokenId) 
        public {
            require(_price > 0, '_price must be > 0');
            Item storage item = tokenIdToItems[_tokenId];
            require(item.state != State.LOCKED, 'NFT must not be locked');
            item.state = State.SALE;
            item.price = _price;
            emit SaleStarted(
                _tokenId, 
                item.owner, 
                item.price
            );
    }

    /// @dev Stops sale
    /// @param _tokenId The ID of the NFT Token
    function stopSale(uint _tokenId) 
        exists(_tokenId)
        ifTokenOwner(_tokenId)
        public {
            tokenIdToItems[_tokenId].state = State.FROZEN;
        }

    /// @dev Buys NFT item
    /// @param _tokenId The ID of the NFT
    function buyNFT(uint _tokenId) exists(_tokenId) public {
        Item storage item = tokenIdToItems[_tokenId];
        require(item.state != State.FROZEN, 'The item must not be frozened');
        address seller = item.owner;
        _transferWithRoaylties(seller, msg.sender, item.price, _tokenId);
        item.owner = msg.sender;
        item.state = State.FROZEN;
        emit Sale (
            _tokenId,
            seller,
            msg.sender,
            item.price
        );
    }

    /// @dev Buys NFT item
    /// @param _tokenId The ID of the NFT Token
    /// @param _minPrice The initial price for the NFT Item
    /// @param _duration The duration of the NFT auction
    function startAuction(
        uint _tokenId,
        uint _minPrice,
        uint _duration) 
        ifTokenOwner(_tokenId)
        exists(_tokenId) external {
            require(_minPrice > 0, "_minPrice  must be > 0");
            require(_duration >= 86400, "_duration must be more than one day");
            tokenIdToItems[_tokenId].state = State.FROZEN;
            auctions[auctionId] = Auction(
                _tokenId,
                _minPrice,
                tokenIdToItems[_tokenId].owner,
                block.timestamp,
                _duration,
                0,
                address(0)
            );
            auctionId++;
            emit AuctionStarted(
                _tokenId,
                tokenIdToItems[_tokenId].owner,
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
        Auction storage auction = auctions[_auctionId];
        Item storage item = tokenIdToItems[auction.tokenId];
        require(block.timestamp > (auction.startDate + auction.duration), 'that auction must be have ended');
        if(auction.currentRecipient != address(0)) {
            Token(tokenAddress).transferFrom(auction.currentRecipient, auction.seller, auction.currentBestBid);
            NFT(nftAddress).transferFrom(auction.seller, auction.currentRecipient, auction.tokenId);
            item.owner = auction.currentRecipient;
            item.price = auction.currentBestBid;
            item.state = State.FROZEN;
            emit AuctionEnded (
                auction.tokenId,
                auction.currentBestBid,
                auction.currentRecipient
            );
        }
    }

    /// @dev Locks NFT token when it is traded on another chain
    /// @param _tokenId The NFT ID
    function lock(uint _tokenId) onlyRole(BRIDGE_ROLE) public {
        tokenIdToItems[_tokenId].state = State.LOCKED;
        NFT(nftAddress).transferFrom(
            tokenIdToItems[_tokenId].owner, 
            address(this), 
            _tokenId);
        tokenIdToItems[_tokenId].owner = address(this);
    }

    /// @dev Unlocks NFT token when it is redeemed from another chain
    /// @dev That NFT is either created on that chain or has already been transferred to the market
    /// @param _tokenId The NFT ID
    function unlock(uint _tokenId, address _owner) onlyRole(BRIDGE_ROLE) public {
        tokenIdToItems[_tokenId].state = State.FROZEN;
        tokenIdToItems[_tokenId].owner = _owner;
         NFT(nftAddress).transferFrom(
            address(this),
            _owner, 
            _tokenId);
    }

    /// @dev Creates copy of NFT token when it is redeemed from another chain
    /// @dev That NFT is created on another chain and is trasnferring to that chain for the first time
    /// @param _tokenId The NFT ID
    /// @param _owner The address of the NFT owner
    /// @param _uri The NFT metadata
    /// @param _fee fee payament
    function createCopy(
        uint _tokenId, 
        address _owner,
        address _artist,
        string memory _uri, 
        uint _fee,
        uint _chainId) 
        onlyRole(BRIDGE_ROLE) public {
            correspondingIds[_tokenId] = NFT(nftAddress).totalSupply();
            alreadyCopiedNfts[_tokenId] = true;
            _createNFT(_tokenId, _owner, _artist, _uri, _fee, _chainId);
    }

    /// @dev Returns inforamtion about item
    /// @param _tokenId The NFT ID
    function getItem(uint _tokenId) public view returns(Item memory item) {
        item = tokenIdToItems[_tokenId];
    }

    /// @dev Returns true if NFT from other chain was already copied on that chain
    /// @param _tokenId The NFT ID on another chaib
    function copiedNfts(uint _tokenId) public view returns(bool) {
        return alreadyCopiedNfts[_tokenId];
    }

    /// @dev Creates NFT
    /// @param _tokenURI Metadata URI of NFT
    /// @param _fee Royalty payment to the creator
    function _createNFT(
        uint _tokenId,
        address _owner,
        address _artist,
        string memory _tokenURI,
        uint _fee,
        uint _chainId) 
        internal  {
            // `tokenId` on that chain
            // `_tokenId` can be ID either on that chain or on another chain
            uint tokenId = NFT(nftAddress).totalSupply();
            NFT(nftAddress).createToken(_artist, _owner, _tokenURI, _fee);
            tokenIdToItems[tokenId] = Item(
                _tokenId,
                _owner,
                State.FROZEN,
                0,
                _chainId
            );
            emit ItemCreated (
                _tokenId,
                _owner,
                0,
                _chainId
            );
        }
    
    /// @dev Checks that auction exists, has not ended, the offered bid is higher than the current one  and a user has enough funds 
    /// @dev Updates the current auction state
    /// @param _auctionId The ID of the auction
    /// @param _bid Placed bid
    function  _updateCurrentBid(uint _auctionId, uint _bid) internal {
        Auction storage auction = auctions[_auctionId];
        require(auction.minPrice > 0, 'that auction does not exist');
        require(_bid > auction.currentBestBid, 'the offered bid must be higher the current one');
        require(block.timestamp < (auction.startDate + auction.duration), 'that auction has ended');
        require(Token(tokenAddress).balanceOf(msg.sender) >= _bid, 'the balance of a caller must be enough for that bid');
        auction.currentBestBid = _bid;
        auction.currentRecipient = msg.sender;
    }

    /// @dev Transfer token with roaylty payment to the creator
    /// @param _seller The seller of the NFT token
    /// @param _buyer The buyer of the NFT token
    /// @param _price The price of the NFT token
    /// @param _tokenId The NFT token ID
    function _transferWithRoaylties(address _seller, address _buyer, uint _price, uint _tokenId)  internal {
        (address recipient, uint fee) = NFT(nftAddress).royaltyInfo(_tokenId, _price);
        if(_seller == recipient || fee <= 0) {
            Token(tokenAddress).transferFrom(_buyer, _seller, _price);
            NFT(nftAddress).transferFrom(_seller, _buyer, _tokenId);
        } else {
            Token(tokenAddress).transferFrom(_buyer, recipient, fee);
            Token(tokenAddress).transferFrom(_buyer, _seller, _price - fee);
            NFT(nftAddress).transferFrom(_seller, _buyer, _tokenId);
        }
    }
}
