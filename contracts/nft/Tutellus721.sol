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
    bytes32 private immutable _NEW_NFT_TYPEHASH = keccak256('Mint(bytes32 eventId,address account)');
    bytes32 private immutable _ENERGY = keccak256('ENERGY');
    bytes32 private immutable _IDO = keccak256('IDO');

    struct Event {
        string uri;
        bool valid;
        bool terminable;
        uint256 energy;
    }

    /** Event mappings */
    mapping(bytes32=>Event) public events;

    /** Account mappings */
    mapping(uint256=>bytes32) public eventOf;
    mapping(address=>uint256) public termDebtOf;
    mapping(bytes32=>bool) private _signed;

    /** Events */
    event Mint(bytes32 eventId, uint256 tokenId, address account);
    event CreateEvent(bytes32 eventId, string eventURI, bool terminable, uint256 energy);
    event Terminate(address account, uint256 energy);

    function createEvent (
        bytes32 eventId,
        string memory uri,
        uint256 energy,
        bool terminable
    ) public onlyRole(_ADMIN_721_ROLE) {
        events[eventId] = Event(uri, true, terminable, energy);
    }

    function mint (
        bytes32 eventId,
        address account,
        bytes memory signature, 
        address signer
    ) public {
        require(hasRole(_AUTH_NFT_SIGNER, signer), 'Tutellus721: invalid signer');

        bytes32 structHash = keccak256(abi.encode(_NEW_NFT_TYPEHASH, eventId, account));
        bytes32 hash = _hashTypedDataV4(structHash);

        require(!_signed[hash], 'Tutellus721: already signed');
        _signed[hash] = true;

        bool validation = SignatureCheckerUpgradeable.isValidSignatureNow(signer, hash, signature);
        require(validation, 'Tutellus721: invalid signature');

        _mint(eventId, account);
    }

    function _mint (
        bytes32 eventId,
        address account
    ) internal {
        Event memory e = events[eventId];
        require(e.valid, 'Tutellus721: event not valid');

        if (e.terminable) {
            termDebtOf[account] += e.energy;
        }

        if (e.energy > 0) {
            ITutellusEnergy energyInterface = ITutellusEnergy(ITutellusManager(config).get(_ENERGY));
            energyInterface.mintStatic(account, e.energy);
        }
        
        uint256 tokenId = totalSupply();
        eventOf[tokenId] = eventId;
        
        _safeMint(account, tokenId);
        emit Mint(eventId, tokenId, account);
    }

    function burn (
        uint256 tokenId
    ) public {
        require(_isApprovedOrOwner(msg.sender, tokenId) || hasRole(_ADMIN_721_ROLE, msg.sender), 'Tutellus721: invalid sender');
        _burn(tokenId);
    }

    function terminate (
        address account
    ) public {
        require(msg.sender == ITutellusManager(config).get(_IDO));
        uint256 energy = termDebtOf[account];
        require(energy > 0, 'Tutellus721: cant terminate without energy');
        ITutellusEnergy(ITutellusManager(config).get(_ENERGY)).burnStatic(account, energy);
        termDebtOf[account] = 0;
        emit Terminate(account, energy);
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
        return events[eventOf[tokenId]].uri;
    }

    function initialize () public initializer {
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
        Event memory e = events[eventOf[tokenId]];
        address account = ownerOf(tokenId);
        require(account != address(0), 'Tutellus721: token burned or not minted');
        require(!e.terminable, 'Tutellus721: can only burn interminable tokens');
        ITutellusEnergy(ITutellusManager(config).get(_ENERGY)).burnStatic(account, e.energy);
        super._burn(tokenId);
    }
}