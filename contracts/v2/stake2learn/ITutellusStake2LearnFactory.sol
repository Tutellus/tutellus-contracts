interface ITutellusStake2LearnFactory {
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
    function PAUSER_ROLE() external view returns (bytes32);
    function UPGRADER_ROLE() external view returns (bytes32);
    function beacon() external view returns (address);
    function config() external view returns (address);
    function convertFiat2Token(uint256 amount) external view returns (uint256);
    function convertToken2Fiat(uint256 amount) external view returns (uint256);
    function createS2L(
        bytes32 id,
        uint256 amount,
        uint256 priceFiat,
        uint256 deadline,
        bytes memory signature,
        address signer
    ) external returns (address);
    function feeds(uint256) external view returns (address feedAddress, bool invert);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function implementation() external view returns (address);
    function initialize(address token, address stakingContract, address[] memory feeds, bool[] memory inverts)
        external;
    function pause() external;
    function paused() external view returns (bool);
    function poolAddress() external view returns (address);
    function proxiableUUID() external view returns (bytes32);
    function stakingContract() external view returns (address);
    function token() external view returns (address);
    function unpause() external;
    function updateManager(address manager) external;
    function upgradeTo(address newImplementation) external;
    function upgradeToAndCall(address newImplementation, bytes memory data) external;
    function verifySignature(
        bytes32 id,
        uint256 amount,
        uint256 price,
        uint256 deadline,
        bytes memory signature,
        address signer
    ) external view returns (bool);
}
