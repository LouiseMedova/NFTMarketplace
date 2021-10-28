// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import './Market.sol';
import './NFT.sol';

contract Bridge is AccessControl, ReentrancyGuard{
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant VALIDATOR = keccak256("VALIDATOR");

    address public nftAddress;
    address public marketAddress;
    uint public chainId;

    //events
    event InitSwap (
        uint chainFrom,
        uint chainTo,
        address sender,
        address recipient,
        uint tokenId,
        string tokenURI,
        uint fee,
        uint createdOnChain,
        uint nonce,
        bytes signature
    );

    event Redeem (
        uint chainFrom,
        uint chainTo,
        address sender,
        address recipient,
        uint tokenId,
        uint nonce
    );

    //function modifiers
    modifier onlyChainId(uint _chainId) {
        require(chainId == _chainId, 'wrong chainId');
        _;
    }

    modifier onlyAllowedChainId(uint _chainId) {
        require(chainList[_chainId] == true, '_chainTo is not allowed');
        _;
    }

    enum Status {
        EMPTY,
        SWAP,
        REDEEM
    }

    mapping (bytes32 => Status) public swaps;
    mapping(uint => bool) public chainList;

    constructor(address _nftAddress, address _marketAddress, uint _chainId) {
        nftAddress = _nftAddress;
        marketAddress = _marketAddress;
        chainId = _chainId;
        _setupRole(ADMIN, msg.sender);
        _setRoleAdmin(VALIDATOR, ADMIN);
    }

    /// @dev Updates the NFT contract
    /// @param _nftAddress New address of the NFT contract
    function updateNFTAddress(address _nftAddress) onlyRole(ADMIN) external {
        nftAddress = _nftAddress;
    }

    /// @dev Updates the Chain ID
    /// @param _chainId New Chain ID
    function updateChainId(uint _chainId) onlyRole(ADMIN) external {
        chainId = _chainId;
    }

    /// @dev Allows or denies the bridge connection to another Chain IDs 
    /// @param _chainId  Chain ID that has to be allowed or denied
    /// @param _boolean `true` allows the bridge to connect the Chain ID and `false` denies the bridge to connect the Chain ID
    function setChainId(uint _chainId, bool _boolean) onlyRole(ADMIN) external {
        chainList[_chainId] = _boolean;
    }

    /// @dev Locks the user's NFT on the market and emits an {InitSwap} event indicating the swap
    /// @param _chainFrom Chain ID from which NFT is transferred (it must be chainId)
    /// @param _chainTo Chain ID to which NFT is transferred (it must be in chainList)
    /// @param _recipient The address of the user receiving NFT on the _chainTo
    /// @param _tokenId The NFT ID
    /// @param _nonce The transaction identifier
    /// @param _signature The signature of validator
    function initSwap(
        uint _chainFrom, 
        uint _chainTo,
        address _recipient, 
        uint _tokenId,
        uint _nonce,
        bytes memory _signature
        ) onlyChainId(_chainFrom)
          onlyAllowedChainId(_chainTo)
          external {
            Market.Item memory item = Market(marketAddress).getItem(_tokenId);
            bytes32 hash = keccak256(abi.encode(
                _chainFrom, 
                _chainTo,
                msg.sender,
                _recipient,
                item.tokenId,
                item.createdOnChain,
                _nonce
                ));
            require(swaps[hash] == Status.EMPTY, 'swap status must be EMPTY');
            swaps[hash] =  Status.SWAP;
            Market(marketAddress).lock(_tokenId);
            emit InitSwap (
                _chainFrom,
                _chainTo,
                msg.sender,
                _recipient,
                item.tokenId,
                NFT(nftAddress).tokenURI(_tokenId),
                NFT(nftAddress).getFee(_tokenId),
                item.createdOnChain,
                _nonce,
                _signature
            );
    }

    /// @dev Сalculates the hash from the input parameters and using `_signature` recovers validator address
    /// @dev If recovered address coincides with `_validator` and the function is called for the first time, it unlocks the NFT
    /// @dev Emits an {Redeem} event indicating the token redemption
    /// @param _chainFrom Chain ID from which tokens are transferred (it must be in chainList)
    /// @param _chainTo Chain ID to which tokens are transferred (it must be chainId)
    /// @param _sender The address of the user having sended tokens from `_chainFrom`
    /// @param _recipient The address of the user receiving tokens on `_chainTo`
    /// @param _tokenId The amount of tokens to be swaped
    /// @param _nonce The transaction identifier
    /// @param _signature The signature of validator
    function redeem(
        uint _chainFrom, 
        uint _chainTo,  
        address _sender,
        address _recipient, 
        uint _tokenId, 
        string memory _uri,
        uint _fee,
        uint _createdOnChain,
        uint _nonce, 
        bytes memory _signature
        ) nonReentrant
          onlyChainId(_chainTo)
          onlyAllowedChainId(_chainFrom)
          external {
            bytes32 hash = keccak256(abi.encode(
                _chainFrom, 
                _chainTo,
                _sender,
                _recipient,
                _tokenId,
                _createdOnChain,
                _nonce
                ));
            require(swaps[hash] == Status.EMPTY, 'swap status must be EMPTY');
            bytes32 _hashToEth = ECDSA.toEthSignedMessageHash(hash);
            address validator = ECDSA.recover(_hashToEth, _signature);
            require(hasRole(VALIDATOR, validator), 'wrong validator');
            if (_createdOnChain == _chainTo) {
                Market(marketAddress).unlock(_tokenId);
            } else {
                Market(marketAddress).unlock(_tokenId, _recipient, _uri, _fee, _createdOnChain);
            }
            swaps[hash] = Status.REDEEM;
            emit Redeem (
                _chainFrom,
                _chainTo,
                _sender,
                _recipient,
                _tokenId,
                _nonce
            );
          }
}