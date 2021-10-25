// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

import "./Token.sol";
import './NFT.sol';

contract Marketplace is AccessControl {
    bytes32 public constant ARTIST_ROLE = keccak256("ARTIST");
    mapping (uint => Item) public items;
    mapping (uint => address) public itemIdToOwner;
    address public addressOfToken;
    uint public itemId;
    constructor (address _addressOfToken) {
        addressOfToken = _addressOfToken;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    enum State  {
        FROZEN,
        SALE
    }

    struct Item {
        uint tokenId;
        address nftAddress;
        address creator;
        address owner;
        uint itemId;
        State state;
        uint date;
        bool primarySale;
        uint price;
        uint fee;
  }
    event ItemCreated (
        uint tokenId,
        address nftAddress,
        address creator,
        uint price,
        uint fee
    );

    event PrimarySaleStarted (
        uint tokenId,
        address nftAddress,
        address creator,
        uint price,
        uint fee
    );

    event Sale (
        uint tokenId,
        address nftAddress,
        address seller,
        address buyer,
        bool primarySale,
        uint price
    );

    /// @dev Creates NFT
    /// @param _nftAddress The address on NFT contract
    /// @param _tokenURI Metadata URI of NFT
    /// @param _price The price of NFT
    /// @param _fee Royalty payment to the creator (in percents)
    function createNFT(
        address _nftAddress, 
        string memory _tokenURI,
        uint _price,
        uint _fee) 
        onlyRole(ARTIST_ROLE)
        public  {
            require(_price > 0, '_price must be > 0');
            uint tokenId = NFT(_nftAddress).totalSupply();
            NFT(_nftAddress).createToken(msg.sender, _tokenURI);
            itemIdToOwner[itemId] = msg.sender;
            items[itemId] = Item(
                tokenId,
                _nftAddress,
                msg.sender,
                msg.sender,
                itemId,
                State.FROZEN,
                block.timestamp,
                false,
                _price,
                _fee
            );
            itemId++;
            emit ItemCreated (
                tokenId,
                _nftAddress,
                msg.sender,
                _price,
                _fee
            );
        }

    /// @dev Opens primary sale of NFT
    /// @param _itemId The ID of the NFT Item
    function startPrimarySale(uint _itemId) 
        onlyRole(ARTIST_ROLE)
        exists(_itemId)
        onlyCreator(_itemId)
        public {
            Item storage item = items[_itemId];
            require(item.primarySale == false, 'Primary sale was already done');
            items[_itemId].state = State.SALE;
            emit PrimarySaleStarted (
                item.tokenId,
                item.nftAddress,
                item.creator,
                item.price,
                item.fee
            );
        }

    /// @dev Starts secondary sales
    /// @param _itemId The ID of the NFT Item
    /// @param _price The price of the NFT
    function startSale(uint _itemId, uint _price) onlyOwner(_itemId) public {
        require(items[_itemId].primarySale == true, 'There was no primary sale');
        require(_price > 0, '_price must be > 0');
        items[_itemId].state = State.SALE;
        items[_itemId].price = _price;
    }

    /// @dev Stops sale
    /// @param _itemId The ID of the NFT Item
    function stopSale(uint _itemId) 
        exists(_itemId)
        onlyOwner(_itemId)
        public {
            items[_itemId].state = State.FROZEN;
        }
    /// @dev Buys NFT item
    /// @param _itemId The ID of the NFT
    function buyNFT(uint _itemId) exists(_itemId) public {
        Item storage item = items[_itemId];
        require(item.state != State.FROZEN, 'The item must not be frozened');
        uint balance = Token(addressOfToken).balanceOf(msg.sender);
        require(balance >= item.price, 'the balance of a caller must be >= the price item');
        bool primarySale = item.primarySale;
        address previousOwner = item.owner;
        if(primarySale == false) {
            Token(addressOfToken).transferFrom(msg.sender, item.creator, item.price);
            NFT(item.nftAddress).transferFrom(item.creator, msg.sender, item.tokenId);
            items[_itemId].primarySale = true;
        } else {
            uint payToOwner = (item.price*(100 - item.fee)) / 100;
            uint payToCreator = (item.price * item.fee) / 100;
            Token(addressOfToken).transferFrom(msg.sender, item.owner, payToOwner);
            Token(addressOfToken).transferFrom(msg.sender, item.creator, payToCreator);
            NFT(item.nftAddress).transferFrom(item.owner, msg.sender, item.tokenId);    
        }
        items[_itemId].owner = msg.sender;
        items[_itemId].state = State.FROZEN;
        emit Sale (
            item.tokenId,
            item.nftAddress,
            previousOwner,
            msg.sender,
            primarySale,
            item.price
        );
    }


    modifier exists(uint _itemId) {
        require(itemIdToOwner[_itemId] != address(0), 'That item does not exist');
        _;
    }

    modifier onlyOwner(uint _itemId) {
        require(items[_itemId].owner == msg.sender, 'A caller must be the owner of that item');
        _;
    }

     modifier onlyCreator(uint _itemId) {
        require(items[_itemId].creator == msg.sender, 'A caller must be the creator of that item');
        _;
    }

}
