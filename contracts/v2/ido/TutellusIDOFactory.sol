// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "contracts/interfaces/ITutellusIDOFactory.sol";
import "./TutellusIDO.sol";

contract TutellusIDOFactory is ITutellusIDOFactory, UUPSUpgradeableByRole {
    /// @inheritdoc ITutellusIDOFactory
    address public fixedImplementation;

    bytes32 public constant IDO_FACTORY_ADMIN_ROLE =
        keccak256("IDO_FACTORY_ADMIN_ROLE");

    /// @inheritdoc ITutellusIDOFactory
    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        fixedImplementation = address(new TutellusIDO());
    }

    /// @inheritdoc ITutellusIDOFactory
    function updateImplementation(address newImplementation)
        public
        onlyRole(IDO_FACTORY_ADMIN_ROLE)
    {
        fixedImplementation = newImplementation;
        emit NewImplementation(newImplementation);
    }

    /// @inheritdoc ITutellusIDOFactory
    function updateMerkleRootAndVesting(
        address ido,
        bytes32 merkleRoot,
        string memory uri,
        uint256 startDate, 
        uint256 endDate, 
        uint256 cliffTime,
        address idoToken
    ) external onlyRole(IDO_FACTORY_ADMIN_ROLE) {
        TutellusIDO(ido).updateVesting(startDate, endDate, cliffTime);
        TutellusIDO(ido).updateIdoToken(idoToken);
        updateMerkleRoot(ido, merkleRoot, uri);
    }

    /// @inheritdoc ITutellusIDOFactory
    function updateMerkleRoot(
        address ido,
        bytes32 merkleRoot,
        string memory uri
    ) public onlyRole(IDO_FACTORY_ADMIN_ROLE) {
        TutellusIDO(ido).updateMerkleRoot(merkleRoot, uri);
        emit UpdateMerkleRoot(ido, merkleRoot, uri);
    }

    /// @inheritdoc ITutellusIDOFactory
    function closeIDO(address ido) external onlyRole(IDO_FACTORY_ADMIN_ROLE) {
        TutellusIDO(ido).close();
        emit CloseIDO(ido);
    }

    /// @inheritdoc ITutellusIDOFactory
    function createProxy(bytes calldata initializeCalldata, bytes32 id)
        public
        onlyRole(IDO_FACTORY_ADMIN_ROLE)
        returns (address proxy)
    {
        (proxy) = _createProxy(fixedImplementation, initializeCalldata, id);
    }

    /// @inheritdoc ITutellusIDOFactory
    function createProxyWithCustomImplementation(
        address implementation,
        bytes calldata initializeCalldata,
        bytes32 id
    ) public onlyRole(IDO_FACTORY_ADMIN_ROLE) returns (address proxy) {
        (proxy) = _createProxy(implementation, initializeCalldata, id);
    }

    function _createProxy(
        address implementation,
        bytes calldata initializeCalldata,
        bytes32 id
    ) private whenNotPaused returns (address proxyAddress) {
        proxyAddress = address(
            new ERC1967Proxy(implementation, initializeCalldata)
        );

        (
            address roleManager_,
            uint256 fundingAmount_,
            uint256 minPrefund_,
            address prefundToken_,
            uint256 openDate_
        ) = abi.decode(
                initializeCalldata[4:],
                (
                    address,
                    uint256,
                    uint256,
                    address,
                    uint256
                )
            );

        emit NewIDO(
            proxyAddress,
            id,
            roleManager_,
            fundingAmount_,
            minPrefund_,
            prefundToken_,
            openDate_
        );
    }
}
