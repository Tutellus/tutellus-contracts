// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "contracts/utils/UUPSUpgradeableByRole.sol";
import "./TutellusIDO.sol";

contract TutellusIDOFactory is UUPSUpgradeableByRole {
    address public fixedImplementation;

    event NewIDO(
        address indexed proxy,
        address token,
        uint256 fundingAmount,
        uint256 minPrefund,
        address idoToken,
        address prefundToken,
        uint256 startDate,
        uint256 endDate,
        uint256 openDate
    );

    event NewImplementation(address implementation);

    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
        fixedImplementation = address(new TutellusIDO());
    }

    function updateImplementation(address newImplementation) public onlyRole(DEFAULT_ADMIN_ROLE) {
        fixedImplementation = newImplementation;
        emit NewImplementation(newImplementation);
    }

    function createProxy(bytes calldata initializeCalldata)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (address proxy)
    {
        (proxy) = _createProxy(fixedImplementation, initializeCalldata);
    }

    function createProxyWithCustomImplementation(address implementation, bytes calldata initializeCalldata)
        public
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (address proxy)
    {
        (proxy) = _createProxy(implementation, initializeCalldata);
    }

    function _createProxy(
        address implementation,
        bytes calldata initializeCalldata
    ) private whenNotPaused returns (address proxyAddress) {
        proxyAddress = address(new ERC1967Proxy(
            implementation,
            initializeCalldata
        )); 

        (
            address token_,
            uint256 fundingAmount_,
            uint256 minPrefund_,
            address idoToken_,
            address prefundToken_,
            uint256 startDate_,
            uint256 endDate_,
            uint256 openDate_
        ) = abi.decode(
                initializeCalldata[4:],
                (address, uint256, uint256, address, address, uint256, uint256, uint256)
            );

        emit NewIDO(
            proxyAddress,
            token_,
            fundingAmount_,
            minPrefund_,
            idoToken_,
            prefundToken_,
            startDate_,
            endDate_,
            openDate_
        );
    }
}
