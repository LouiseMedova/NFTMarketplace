// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";


contract NFT is ERC721Enumerable, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");
    string private baseURI;

    constructor (string memory _name, string memory _symbol, string memory __baseURI) ERC721(_name, _symbol) {
        baseURI = __baseURI;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function createToken(address _to, string memory _tokenURI) public onlyRole(MINTER_ROLE) {
        uint tokenId = totalSupply();
        _safeMint(_to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }


    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
      
}
