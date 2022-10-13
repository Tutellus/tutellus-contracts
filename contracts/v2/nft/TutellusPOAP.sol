// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol';
import 'contracts/utils/UUPSUpgradeableByRole.sol';
import 'contracts/interfaces/ITutellusEnergy.sol';
import 'contracts/interfaces/ITutellusManager.sol';

contract TutellusPOAP is UUPSUpgradeableByRole, ERC721URIStorageUpgradeable, ERC721EnumerableUpgradeable, EIP712Upgradeable {

    /** Identifiers */
    bytes32 public constant _ADMIN_721_ROLE = keccak256('ADMIN_721_ROLE');
    bytes32 public constant _AUTH_NFT_SIGNER = keccak256('AUTH_NFT_SIGNER');
    bytes32 private immutable _ENERGY = keccak256('ENERGY');

    bytes32 private immutable _NEW_NFT_TYPEHASH = keccak256('Mint(bytes32 poapId,address account,bytes32 code,uint256 limit)');

    struct POAP {
        bytes32 ido;
        string uri;
        bool valid;
        bool perpetual;
        uint256 energy;
    }

    /** POAP mappings */
    mapping(bytes32=>POAP) public poaps;
    mapping(uint256=>bytes32) public poapOf;
    mapping(bytes32=>uint256) public codeUses;
    mapping(bytes32=>mapping(address=>bool)) public poapEmitted;

    /** Events */
    event MintPOAP(bytes32 poapId, bytes32 ido, uint256 tokenId, address account, uint256 energy);
    event BurnPOAP(bytes32 poapId, bytes32 ido, uint256 tokenId, address account, uint256 energy);
    event CreatePOAP(bytes32 poapId, bytes32 ido, string uri, bool perpetual, uint256 energy);

    function _createPOAP (
        bytes32 poapId,
        bytes32 ido,
        string memory uri,
        bool perpetual,
        uint256 energy
    ) internal {
        require(!poaps[poapId].valid, 'TutellusPOAP: poap valid');
        poaps[poapId] = POAP(ido, uri, true, perpetual, energy);
        emit CreatePOAP(poapId, ido, uri, perpetual, energy);
    }

    function createPOAP (
        bytes32 poapId,
        bytes32 ido,
        string memory uri,
        bool perpetual,
        uint256 energy
    ) public onlyRole(_ADMIN_721_ROLE) {
        _createPOAP(poapId, ido, uri, perpetual, energy);
    }

    function setValid (
        bytes32 poapId,
        bool value
    ) public onlyRole(_ADMIN_721_ROLE) {
        poaps[poapId].valid = value;
    }

    function adminMint (
        bytes32 poapId,
        address account
    ) public onlyRole(_AUTH_NFT_SIGNER) {
        _mint(poapId, account);
    }

    function mint (
        bytes32 poapId,
        bytes32 code,
        uint256 limit,
        bytes memory signature, 
        address signer
    ) public {
        require(hasRole(_AUTH_NFT_SIGNER, signer), 'TutellusPOAP: invalid signer');
        require(codeUses[code] < limit, 'TutellusPOAP: code limit reached');

        bytes32 structHash = keccak256(abi.encode(
            _NEW_NFT_TYPEHASH,
            poapId,
            msg.sender,
            code,
            limit
        ));
        bytes32 hash = _hashTypedDataV4(structHash);
        bool validation = SignatureCheckerUpgradeable.isValidSignatureNow(signer, hash, signature);
        require(validation, 'TutellusPOAP: invalid signature');

        codeUses[code] = codeUses[code] + 1;

        _mint(poapId, msg.sender);
    }

    function _mint (
        bytes32 poapId,
        address account
    ) internal {
        bool valid = poaps[poapId].valid;
        require(!poapEmitted[poapId][account], 'TutellusPOAP: poap already emitted for account');
        require(valid, 'TutellusPOAP: poap not valid');

        uint256 energy = poaps[poapId].energy;
        bytes32 ido = poaps[poapId].ido;
        if (energy > 0) {
            ITutellusEnergy energyInterface = ITutellusEnergy(ITutellusManager(config).get(_ENERGY));
            bool perpetual = poaps[poapId].perpetual;
            if (perpetual) {
                energyInterface.mintStatic(account, energy);
            } else {
                energyInterface.mintEvent(ido, account, energy);
            }
        }
        
        uint256 tokenId = totalSupply();
        poapOf[tokenId] = poapId;
        poapEmitted[poapId][account] = true;
        
        _safeMint(account, tokenId);
        emit MintPOAP(poapId, ido, tokenId, account, energy);
    }

    function burn (
        uint256 tokenId
    ) public {
        require(_isApprovedOrOwner(msg.sender, tokenId) || hasRole(_ADMIN_721_ROLE, msg.sender), 'TutellusPOAP: invalid sender');
        _burn(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) whenNotPaused {
        require(from == address(0) || to == address(0), 'TutellusPOAP: untransferable');
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return poaps[poapOf[tokenId]].uri;
    }

    function initialize () public initializer {
        __EIP712_init_unchained('TutellusPOAP', '1');
        __ERC721_init('TutellusPOAP', 'TUTPOAP');
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
        // require(account != address(0), 'TutellusPOAP: token burned or not minted');

        bytes32 poapId = poapOf[tokenId];
        uint256 energy = poaps[poapId].energy;
        bytes32 ido = poaps[poapId].ido;

        if (energy > 0) {
            ITutellusEnergy energyInterface = ITutellusEnergy(ITutellusManager(config).get(_ENERGY));
            bool perpetual = poaps[poapId].perpetual;
            if (perpetual) {
                energyInterface.burnStatic(account, energy);
            } else {
                energyInterface.burnEvent(ido, account, energy);
            }
        }
        
        super._burn(tokenId);
        emit BurnPOAP(poapId, ido, tokenId, account, energy);
    }
}