// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol';
import '../utils/UUPSUpgradeableByRole.sol';
import '../interfaces/ITutellusEnergy.sol';
import '../interfaces/ITutellusManager.sol';

contract Tutellus721 is UUPSUpgradeableByRole, ERC721URIStorageUpgradeable, ERC721EnumerableUpgradeable, EIP712Upgradeable {

    /** Identifiers */
    bytes32 public constant _ADMIN_721_ROLE = keccak256('ADMIN_721_ROLE');
    bytes32 public constant _AUTH_NFT_SIGNER = keccak256('AUTH_NFT_SIGNER');
    bytes32 private immutable _NEW_NFT_TYPEHASH = keccak256('Mint(bytes32 poapId,address account)');
    bytes32 private immutable _ENERGY = keccak256('ENERGY');
    bytes32 private immutable _IDO = keccak256('IDO');

    struct POAP {
        bytes32 eventId;
        string uri;
        bool valid;
        bool perpetual;
        uint256 energy;
    }

    /** Event mappings */
    mapping(bytes32=>POAP) public poaps;
    mapping(uint256=>bytes32) public poapOf;

    /** Account mappings */
    mapping(bytes32=>bool) private _signed;

    /** Events */
    event Mint(bytes32 poapId, bytes32 eventId, uint256 tokenId, address account, uint256 energy);
    event Burn(bytes32 poapId, bytes32 eventId, uint256 tokenId, address account, uint256 energy);
    event CreateEvent(bytes32 poapId, bytes32 eventId, string eventURI, bool perpetual, uint256 energy);

    function createEvent (
        bytes32 poapId,
        bytes32 eventId,
        string memory uri,
        bool perpetual,
        uint256 energy
    ) public onlyRole(_ADMIN_721_ROLE) {
        require(!poaps[poapId].valid, 'Tutellus721: poap valid');
        poaps[poapId] = POAP(eventId, uri, true, perpetual, energy);
    }

    function mint (
        bytes32 poapId,
        address account,
        bytes memory signature, 
        address signer
    ) public {
        require(hasRole(_AUTH_NFT_SIGNER, signer), 'Tutellus721: invalid signer');

        bytes32 structHash = keccak256(abi.encode(_NEW_NFT_TYPEHASH, poapId, account));
        bytes32 hash = _hashTypedDataV4(structHash);

        require(!_signed[hash], 'Tutellus721: already signed');
        _signed[hash] = true;

        bool validation = SignatureCheckerUpgradeable.isValidSignatureNow(signer, hash, signature);
        require(validation, 'Tutellus721: invalid signature');

        _mint(poapId, account);
    }

    function _mint (
        bytes32 poapId,
        address account
    ) internal {
        bool valid = poaps[poapId].valid;
        require(valid, 'Tutellus721: poap not valid');

        uint256 energy = poaps[poapId].energy;
        bytes32 eventId = poaps[poapId].eventId;
        if (energy > 0) {
            ITutellusEnergy energyInterface = ITutellusEnergy(ITutellusManager(config).get(_ENERGY));
            bool perpetual = poaps[poapId].perpetual;
            if (perpetual) {
                energyInterface.mintStatic(account, energy);
            } else {
                energyInterface.mintEvent(eventId, account, energy);
            }
        }
        
        uint256 tokenId = totalSupply();
        poapOf[tokenId] = poapId;
        
        _safeMint(account, tokenId);
        emit Mint(poapId, eventId, tokenId, account, energy);
    }

    function burn (
        uint256 tokenId
    ) public {
        require(_isApprovedOrOwner(msg.sender, tokenId) || hasRole(_ADMIN_721_ROLE, msg.sender), 'Tutellus721: invalid sender');
        _burn(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) whenNotPaused {
        require(from == address(0) || to == address(0), 'Tutellus721: untransferable');
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return poaps[poapOf[tokenId]].uri;
    }

    function initialize () public initializer {
        __EIP712_init_unchained('Tutellus721', '1');
        __ERC721_init('Tutellus721', 'TUT721');
        __AccessControlProxyPausable_init(msg.sender);
    }

    /**  The following functions are overrides required by Solidity */

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {   
        address account = ownerOf(tokenId);
        // require(account != address(0), 'Tutellus721: token burned or not minted');

        bytes32 poapId = poapOf[tokenId];
        uint256 energy = poaps[poapId].energy;
        bytes32 eventId = poaps[poapId].eventId;

        if (energy > 0) {
            ITutellusEnergy energyInterface = ITutellusEnergy(ITutellusManager(config).get(_ENERGY));
            bool perpetual = poaps[poapId].perpetual;
            if (perpetual) {
                energyInterface.burnStatic(account, energy);
            } else {
                energyInterface.burnEvent(eventId, account, energy);
            }
        }
        
        super._burn(tokenId);
        emit Burn(poapId, eventId, tokenId, account, energy);
    }
}