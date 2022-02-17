// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/cryptography/SignatureCheckerUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol';
import '../utils/UUPSUpgradeableByRole.sol';

contract Tutellus721 is UUPSUpgradeableByRole, ERC721URIStorageUpgradeable, ERC721EnumerableUpgradeable, EIP712Upgradeable {

    bytes32 private constant ADMIN_721_ROLE = keccak256('ADMIN_721_ROLE');
    bytes32 public constant AUTH_NFT_SIGNER = keccak256('AUTH_NFT_SIGNER');
    bytes32 private immutable _NEW_NFT_TYPEHASH = keccak256('Mint(bytes32 eventId,address account,uint256 deadline)');

    mapping(uint256=>bytes32) public eventOf;
    mapping(bytes32=>bool) public validEvent;
    mapping(bytes32=>string) public eventURIs;

    mapping(bytes32=>bool) private _signed;
    uint256 private _next;

    event Mint(bytes32 eventId, uint256 tokenId, address account);

    function createEvent (
        bytes32 eventId,
        string memory eventURI
    ) public onlyRole(ADMIN_721_ROLE) {
        validEvent[eventId] = true;
        eventURIs[eventId] = eventURI;
    }

    function mintToken (
        bytes32 eventId,
        address account,
        uint256 deadline,
        bytes memory signature, 
        address signer
    ) public {
        require(block.timestamp <= deadline, 'Tutellus721: expired deadline');
        require(validEvent[eventId], 'Tutellus721: event not valid');
        require(hasRole(AUTH_NFT_SIGNER, signer), 'Tutellus721: invalid signer');

        bytes32 structHash = keccak256(abi.encode(_NEW_NFT_TYPEHASH, eventId, account, deadline));
        bytes32 hash = _hashTypedDataV4(structHash);

        require(!_signed[hash], 'Tutellus721: already _signed');
        _signed[hash] = true;

        bool validation = SignatureCheckerUpgradeable.isValidSignatureNow(signer, hash, signature);
        require(validation, 'Tutellus721: invalid signature');

        _mintToken(eventId, account);
    }

    function _mintToken (
        bytes32 eventId,
        address account
    ) internal whenNotPaused {
        uint256 tokenId = _next;
        _next++;
        eventOf[tokenId] = eventId;

        _mint(to, tokenId);
        emit Mint(eventId, tokenId, account);
    }
}